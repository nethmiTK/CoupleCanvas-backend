const crypto = require('crypto');
const Photographer = require('../models/Photographer');
const Proposal = require('../models/Proposal');
const { getDb } = require('../db/mongo');

function getVendorIdFromRequest(req) {
  const bodyVendorId = req.body.vendorId;
  if (bodyVendorId && req.user && req.user.id && String(bodyVendorId) !== String(req.user.id)) {
    return null;
  }
  return bodyVendorId || req.user?.id;
}

function calculateSubscriptionEndDate(startDate, durationDays) {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + Number(durationDays || 30));
  return endDate;
}

function normalizeVendorType(vendorType) {
  if (vendorType === 'photographer') return 'album';
  return vendorType || 'album';
}

function getVendorModel(vendorType) {
  return normalizeVendorType(vendorType) === 'proposal' ? Proposal : Photographer;
}

function getAdminRoute(vendorType) {
  return normalizeVendorType(vendorType) === 'proposal'
    ? '/v_proposals_admin'
    : '/photographer-admin/gallery';
}

function getVendorSubscription(vendor, vendorType) {
  // Use direct fields instead of vendorSubscriptions array
  return {
    subPlan: vendor.subPlan,
    paymentMethod: vendor.paymentMethod,
    paymentSlip: vendor.paymentSlip,
    paymentStatus: vendor.paymentStatus,
    paymentAmount: vendor.paymentAmount,
    paymentId: vendor.paymentId,
    transactionId: vendor.transactionId,
    paidAt: vendor.paidAt,
    subscriptionStartDate: vendor.subscriptionStartDate,
    subscriptionEndDate: vendor.subscriptionEndDate,
  };
}

function upsertVendorSubscription(vendor, vendorType, subscriptionData) {
  // Update direct fields on the vendor document
  Object.assign(vendor, subscriptionData);
  return subscriptionData;
}

function resolveSubscriptionAccessState(vendor, vendorType) {
  const subscription = getVendorSubscription(vendor, vendorType);
  if (!subscription?.subPlan) {
    return {
      state: 'no_plan',
      nextRoute: '/subscription-plans',
    };
  }

  const status = subscription.paymentStatus;
  if (status === 'active') {
    return {
      state: 'active',
      nextRoute: getAdminRoute(vendorType),
    };
  }

  const now = Date.now();
  const hasStart = !!subscription.subscriptionStartDate;
  const hasEnd = !!subscription.subscriptionEndDate;
  const endMs = hasEnd ? new Date(subscription.subscriptionEndDate).getTime() : null;
  const isExpired = endMs ? endMs < now : false;

  if (isExpired) {
    return {
      state: 'expired',
      nextRoute: '/subscription-plans',
    };
  }

  if ((status === 'active' || status === 'paid') && hasStart) {
    return {
      state: 'active',
      nextRoute: getAdminRoute(vendorType),
    };
  }

  if (status === 'pending' || status === 'rejected') {
    return {
      state: status,
      nextRoute: '/payment-profiles',
    };
  }

  return {
    state: 'pending',
    nextRoute: '/payment-profiles',
  };
}

async function getSubPlanById(planId) {
  if (!planId) return null;
  const db = getDb();
  const { ObjectId } = require('mongodb');
  if (!ObjectId.isValid(planId)) return null;
  return db.collection('sub_plan').findOne({ _id: new ObjectId(planId) });
}

async function findVendorRecord(vendorId, vendorType) {
  const VendorModel = getVendorModel(vendorType);
  const directRecord = await VendorModel.findById(vendorId);
  if (directRecord || normalizeVendorType(vendorType) !== 'proposal') {
    return directRecord;
  }

  const photographer = await Photographer.findById(vendorId);
  if (!photographer?.email) {
    return null;
  }

  return Proposal.findOne({ email: photographer.email.toLowerCase() });
}

const uploadPaymentSlip = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No payment slip uploaded' });
  }

  return res.status(200).json({
    success: true,
    imageUrl: `/uploads/payment-slips/${req.file.filename}`,
  });
};

const subscribeWithSlip = async (req, res, next) => {
  try {
    const vendorId = getVendorIdFromRequest(req);
    if (!vendorId) {
      return res.status(403).json({ success: false, error: 'Unauthorized vendor access' });
    }

    const { vendorType, planId, planName, planDuration, amount, paymentSlip, paymentMethod, status } = req.body;
    const normalizedVendorType = normalizeVendorType(vendorType);
    const VendorModel = getVendorModel(normalizedVendorType);

    if (!normalizedVendorType || !planName) {
      return res.status(400).json({ success: false, error: 'vendorType and planName are required' });
    }

    if (Number(amount || 0) > 0 && !paymentSlip) {
      return res.status(400).json({ success: false, error: 'Payment slip is required for paid plans' });
    }

    const vendor = await findVendorRecord(vendorId, normalizedVendorType);
    if (!vendor) {
      return res.status(404).json({ success: false, error: 'Vendor not found' });
    }

    const now = new Date();
    const startDate = status === 'active' || Number(amount || 0) === 0 ? now : null;
    const endDate = startDate ? calculateSubscriptionEndDate(startDate, planDuration || 30) : null;
    const paymentStatus = Number(amount || 0) === 0 ? 'active' : 'pending';

    vendor.vendorTypes = Array.from(new Set([...(vendor.vendorTypes || []), normalizedVendorType]));
    upsertVendorSubscription(vendor, normalizedVendorType, {
      subPlan: planName,
      paymentMethod: paymentMethod === 'payhere' ? 'payhere' : 'payment-slip',
      paymentSlip: paymentSlip || null,
      paymentStatus,
      paymentAmount: Number(amount || 0),
      paymentId: `SLIP-${Date.now()}`,
      transactionId: null,
      paidAt: Number(amount || 0) === 0 ? now : null,
      subscriptionStartDate: startDate,
      subscriptionEndDate: endDate,
    });

    vendor.subPlan = planName;
    vendor.paymentMethod = paymentMethod === 'payhere' ? 'payhere' : 'payment-slip';
    vendor.paymentSlip = paymentSlip || null;
    vendor.paymentStatus = paymentStatus;
    vendor.paymentAmount = Number(amount || 0);
    vendor.paymentId = `SLIP-${Date.now()}`;
    vendor.transactionId = null;
    vendor.paidAt = Number(amount || 0) === 0 ? now : null;
    vendor.subscriptionStartDate = startDate;
    vendor.subscriptionEndDate = endDate;

    // Keep legacy account status workflow while subscription state uses paymentStatus.
    vendor.status = Number(amount || 0) === 0 ? 'approved' : 'pending';

    await vendor.save();

    return res.status(201).json({
      success: true,
      vendorId: vendor._id.toString(),
      vendorType: normalizedVendorType,
      subPlan: vendor.subPlan,
      paymentStatus: vendor.paymentStatus,
      status: Number(amount || 0) === 0 ? 'active' : 'pending',
      message: Number(amount || 0) === 0
        ? 'Free plan activated successfully'
        : 'Payment slip submitted. Waiting for admin approval.',
    });
  } catch (error) {
    next(error);
  }
};

const getMySubscription = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const normalizedVendorType = normalizeVendorType(req.query.vendorType);
    if (!req.user?.id || String(vendorId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, error: 'Unauthorized vendor access' });
    }

    const vendor = await findVendorRecord(vendorId, normalizedVendorType);
    if (!vendor) {
      return res.status(404).json({ success: false, error: 'Vendor not found' });
    }

    const subscription = getVendorSubscription(vendor, normalizedVendorType);
    const planDuration = subscription?.subscriptionStartDate && subscription?.subscriptionEndDate
      ? Math.max(
          1,
          Math.ceil(
            (new Date(subscription.subscriptionEndDate).getTime() -
              new Date(subscription.subscriptionStartDate).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : undefined;

    const accessState = resolveSubscriptionAccessState(vendor, normalizedVendorType);

    const subscriptions = subscription?.subPlan
      ? [{
          _id: `${vendor._id.toString()}-${normalizedVendorType}`,
          vendorType: normalizedVendorType,
          planName: subscription.subPlan || '',
          planDuration,
          status: accessState.state,
          amount: subscription.paymentAmount || 0,
          createdAt: vendor.updatedAt || vendor.createdAt,
          paymentMethod: subscription.paymentMethod,
          paymentSlip: subscription.paymentSlip,
        }]
      : [];

    return res.status(200).json({
      success: true,
      subscriptions,
    });
  } catch (error) {
    next(error);
  }
};

const createPayHereCheckout = async (req, res, next) => {
  try {
    const vendorId = getVendorIdFromRequest(req);
    if (!vendorId) {
      return res.status(403).json({ success: false, error: 'Unauthorized vendor access' });
    }

    const { vendorType, planId, planName, amount, currency = 'LKR' } = req.body;
    const normalizedVendorType = normalizeVendorType(vendorType);
    const VendorModel = getVendorModel(normalizedVendorType);

    if (!planName || !amount) {
      return res.status(400).json({ success: false, error: 'planName and amount are required' });
    }

    const vendor = await findVendorRecord(vendorId, normalizedVendorType);
    if (!vendor) {
      return res.status(404).json({ success: false, error: 'Vendor not found' });
    }

    const orderId = `${normalizedVendorType.toUpperCase()}-PH-${Date.now()}-${vendor._id.toString().slice(-6)}`;
    const merchantId = process.env.PAYHERE_MERCHANT_ID || '';
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET || '';

    let hash = '';
    if (merchantId && merchantSecret) {
      const secretMd5 = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
      const amountFormatted = Number(amount).toFixed(2);
      hash = crypto
        .createHash('md5')
        .update(`${merchantId}${orderId}${amountFormatted}${currency}${secretMd5}`)
        .digest('hex')
        .toUpperCase();
    }

    vendor.vendorTypes = Array.from(new Set([...(vendor.vendorTypes || []), normalizedVendorType]));
    upsertVendorSubscription(vendor, normalizedVendorType, {
      subPlan: planName,
      paymentMethod: 'payhere',
      paymentAmount: Number(amount || 0),
      paymentStatus: 'pending',
      paymentId: orderId,
      transactionId: null,
      paymentSlip: null,
      subscriptionStartDate: null,
      subscriptionEndDate: null,
      paidAt: null,
    });

    vendor.subPlan = planName;
    vendor.paymentMethod = 'payhere';
    vendor.paymentAmount = Number(amount || 0);
    vendor.paymentStatus = 'pending';
    vendor.paymentId = orderId;
    vendor.transactionId = null;
    vendor.paymentSlip = null;
    vendor.subscriptionStartDate = null;
    vendor.subscriptionEndDate = null;
    vendor.paidAt = null;
    vendor.status = 'pending';
    await vendor.save();

    const plan = await getSubPlanById(planId);

    return res.status(200).json({
      success: true,
      paymentMethod: 'payhere',
      orderId,
      merchantId,
      currency,
      amount: Number(amount).toFixed(2),
      hash,
      planDuration: plan?.duration || 30,
      payhereUrl: process.env.PAYHERE_CHECKOUT_URL || 'https://sandbox.payhere.lk/pay/checkout',
    });
  } catch (error) {
    next(error);
  }
};

const payHereCallback = async (req, res, next) => {
  try {
    const {
      order_id,
      payment_id,
      payhere_amount,
      payhere_currency,
      status_code,
      md5sig,
    } = req.body;

    if (!order_id) {
      return res.status(400).json({ success: false, error: 'order_id is required' });
    }

    const orderVendorType = String(order_id).split('-PH-')[0]?.toLowerCase();
    const VendorModel = getVendorModel(orderVendorType);
    const vendor = await VendorModel.findOne({ paymentId: order_id });
    if (!vendor) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // Optional signature validation when env vars are present
    const merchantId = process.env.PAYHERE_MERCHANT_ID || '';
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET || '';
    if (merchantId && merchantSecret && md5sig) {
      const secretMd5 = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
      const localSig = crypto
        .createHash('md5')
        .update(`${merchantId}${order_id}${Number(payhere_amount || 0).toFixed(2)}${payhere_currency}${status_code}${secretMd5}`)
        .digest('hex')
        .toUpperCase();

      if (localSig !== String(md5sig).toUpperCase()) {
        return res.status(400).json({ success: false, error: 'Invalid signature' });
      }
    }

    if (String(status_code) === '2') {
      const now = new Date();
      upsertVendorSubscription(vendor, orderVendorType, {
        ...getVendorSubscription(vendor, orderVendorType),
        paymentStatus: 'active',
        transactionId: payment_id || null,
        paidAt: now,
        subscriptionStartDate: now,
        subscriptionEndDate: calculateSubscriptionEndDate(now, 30),
      });
      vendor.paymentStatus = 'active';
      vendor.transactionId = payment_id || vendor.transactionId;
      vendor.paidAt = now;
      vendor.subscriptionStartDate = now;
      vendor.subscriptionEndDate = calculateSubscriptionEndDate(now, 30);
      vendor.status = 'approved';
      await vendor.save();
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

const adminUpdateSubscriptionStatus = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const { paymentStatus, activate } = req.body;
    const normalizedVendorType = normalizeVendorType(req.body.vendorType);
    const VendorModel = getVendorModel(normalizedVendorType);

    const vendor = await findVendorRecord(vendorId, normalizedVendorType);
    if (!vendor) {
      return res.status(404).json({ success: false, error: 'Vendor not found' });
    }

    if (paymentStatus) {
      upsertVendorSubscription(vendor, normalizedVendorType, {
        ...getVendorSubscription(vendor, normalizedVendorType),
        paymentStatus,
      });
      vendor.paymentStatus = paymentStatus;
    }

    if (activate === true) {
      const now = new Date();
      const currentSubscription = getVendorSubscription(vendor, normalizedVendorType);
      const duration = currentSubscription?.subscriptionStartDate && currentSubscription?.subscriptionEndDate
        ? Math.max(
            1,
            Math.ceil(
              (new Date(currentSubscription.subscriptionEndDate).getTime() -
                new Date(currentSubscription.subscriptionStartDate).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          )
        : 30;
      upsertVendorSubscription(vendor, normalizedVendorType, {
        ...currentSubscription,
        paymentStatus: 'active',
        paidAt: now,
        subscriptionStartDate: now,
        subscriptionEndDate: calculateSubscriptionEndDate(now, duration),
      });
      vendor.paymentStatus = 'active';
      vendor.paidAt = now;
      vendor.subscriptionStartDate = now;
      vendor.subscriptionEndDate = calculateSubscriptionEndDate(now, duration);
      vendor.status = 'approved';
    }

    await vendor.save();

    return res.status(200).json({
      success: true,
      vendorId: vendor._id.toString(),
      paymentStatus: vendor.paymentStatus,
      status: vendor.status,
    });
  } catch (error) {
    next(error);
  }
};

const getSubscriptionAccessState = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const normalizedVendorType = normalizeVendorType(req.query.vendorType);

    if (!req.user?.id || String(vendorId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, error: 'Unauthorized vendor access' });
    }

    const vendor = await findVendorRecord(vendorId, normalizedVendorType);
    if (!vendor) {
      return res.status(404).json({ success: false, error: 'Vendor not found' });
    }

    const subscription = getVendorSubscription(vendor, normalizedVendorType);
    const access = resolveSubscriptionAccessState(vendor, normalizedVendorType);

    return res.status(200).json({
      success: true,
      vendorId: vendor._id.toString(),
      subPlan: subscription?.subPlan || null,
      paymentStatus: subscription?.paymentStatus || null,
      accessState: access.state,
      nextRoute: access.nextRoute,
      subscriptionStartDate: subscription?.subscriptionStartDate || null,
      subscriptionEndDate: subscription?.subscriptionEndDate || null,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadPaymentSlip,
  subscribeWithSlip,
  getMySubscription,
  createPayHereCheckout,
  payHereCallback,
  adminUpdateSubscriptionStatus,
  getSubscriptionAccessState,
  resolveSubscriptionAccessState,
};
