const crypto = require('crypto');
const Photographer = require('../models/Photographer');
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
  return vendorType;
}

function resolveSubscriptionAccessState(photographer) {
  if (!photographer?.subPlan) {
    return {
      state: 'no_plan',
      nextRoute: '/subscription-plans',
    };
  }

  const status = photographer.paymentStatus;
  if (status === 'active') {
    return {
      state: 'active',
      nextRoute: '/photographer-admin/gallery',
    };
  }

  const now = Date.now();
  const hasStart = !!photographer.subscriptionStartDate;
  const hasEnd = !!photographer.subscriptionEndDate;
  const endMs = hasEnd ? new Date(photographer.subscriptionEndDate).getTime() : null;
  const isExpired = endMs ? endMs < now : false;

  if ((status === 'active' || status === 'paid') && hasStart && !isExpired) {
    return {
      state: 'active',
      nextRoute: '/photographer-admin/gallery',
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

    if (!normalizedVendorType || !planName) {
      return res.status(400).json({ success: false, error: 'vendorType and planName are required' });
    }

    if (Number(amount || 0) > 0 && !paymentSlip) {
      return res.status(400).json({ success: false, error: 'Payment slip is required for paid plans' });
    }

    const photographer = await Photographer.findById(vendorId);
    if (!photographer) {
      return res.status(404).json({ success: false, error: 'Vendor not found' });
    }

    const now = new Date();
    const startDate = status === 'active' || Number(amount || 0) === 0 ? now : null;
    const endDate = startDate ? calculateSubscriptionEndDate(startDate, planDuration || 30) : null;

    photographer.vendorTypes = Array.from(new Set([...(photographer.vendorTypes || []), normalizedVendorType]));
    photographer.subPlan = planName;
    photographer.paymentMethod = paymentMethod === 'payhere' ? 'payhere' : 'payment-slip';
    photographer.paymentSlip = paymentSlip || null;
    photographer.paymentStatus = Number(amount || 0) === 0 ? 'active' : 'pending';
    photographer.paymentAmount = Number(amount || 0);
    photographer.paymentId = `SLIP-${Date.now()}`;
    photographer.transactionId = null;
    photographer.paidAt = Number(amount || 0) === 0 ? now : null;
    photographer.subscriptionStartDate = startDate;
    photographer.subscriptionEndDate = endDate;

    // Keep legacy account status workflow while subscription state uses paymentStatus.
    photographer.status = Number(amount || 0) === 0 ? 'approved' : 'pending';

    await photographer.save();

    return res.status(201).json({
      success: true,
      vendorId: photographer._id.toString(),
      vendorType: normalizedVendorType,
      subPlan: photographer.subPlan,
      paymentStatus: photographer.paymentStatus,
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
    if (!req.user?.id || String(vendorId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, error: 'Unauthorized vendor access' });
    }

    const photographer = await Photographer.findById(vendorId);
    if (!photographer) {
      return res.status(404).json({ success: false, error: 'Vendor not found' });
    }

    const planDuration = photographer.subscriptionStartDate && photographer.subscriptionEndDate
      ? Math.max(
          1,
          Math.ceil(
            (new Date(photographer.subscriptionEndDate).getTime() -
              new Date(photographer.subscriptionStartDate).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : undefined;

    const accessState = resolveSubscriptionAccessState(photographer);

    const targetVendorTypes = (photographer.vendorTypes || []).filter((type) => ['album', 'photographer', 'proposal'].includes(type));

    const subscriptions = targetVendorTypes.map((type) => ({
      _id: `${photographer._id.toString()}-${type}`,
      vendorType: type,
      planName: photographer.subPlan || '',
      planDuration,
      status: accessState.state,
      amount: photographer.paymentAmount || 0,
      createdAt: photographer.updatedAt || photographer.createdAt,
      paymentMethod: photographer.paymentMethod,
      paymentSlip: photographer.paymentSlip,
    }));

    return res.status(200).json({
      success: true,
      subscriptions: photographer.subPlan ? subscriptions : [],
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

    if (!planName || !amount) {
      return res.status(400).json({ success: false, error: 'planName and amount are required' });
    }

    const photographer = await Photographer.findById(vendorId);
    if (!photographer) {
      return res.status(404).json({ success: false, error: 'Vendor not found' });
    }

    const orderId = `PH-${Date.now()}-${photographer._id.toString().slice(-6)}`;
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

    photographer.vendorTypes = Array.from(new Set([...(photographer.vendorTypes || []), normalizedVendorType]));
    photographer.subPlan = planName;
    photographer.paymentMethod = 'payhere';
    photographer.paymentAmount = Number(amount || 0);
    photographer.paymentStatus = 'pending';
    photographer.paymentId = orderId;
    photographer.transactionId = null;
    photographer.paymentSlip = null;
    photographer.subscriptionStartDate = null;
    photographer.subscriptionEndDate = null;
    photographer.paidAt = null;
    photographer.status = 'pending';
    await photographer.save();

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

    const photographer = await Photographer.findOne({ paymentId: order_id });
    if (!photographer) {
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
      const duration = (() => {
        const planName = photographer.subPlan || '';
        if (!planName) return 30;
        return 30;
      })();

      photographer.paymentStatus = 'active';
      photographer.transactionId = payment_id || photographer.transactionId;
      photographer.paidAt = now;
      photographer.subscriptionStartDate = now;
      photographer.subscriptionEndDate = calculateSubscriptionEndDate(now, duration);
      photographer.status = 'approved';
      await photographer.save();
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

    const photographer = await Photographer.findById(vendorId);
    if (!photographer) {
      return res.status(404).json({ success: false, error: 'Vendor not found' });
    }

    if (paymentStatus) {
      photographer.paymentStatus = paymentStatus;
    }

    if (activate === true) {
      const now = new Date();
      photographer.paymentStatus = 'active';
      photographer.paidAt = now;
      photographer.subscriptionStartDate = now;
      const duration = photographer.subscriptionStartDate && photographer.subscriptionEndDate
        ? Math.max(
            1,
            Math.ceil(
              (new Date(photographer.subscriptionEndDate).getTime() -
                new Date(photographer.subscriptionStartDate).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          )
        : 30;
      photographer.subscriptionEndDate = calculateSubscriptionEndDate(now, duration);
      photographer.status = 'approved';
    }

    await photographer.save();

    return res.status(200).json({
      success: true,
      vendorId: photographer._id.toString(),
      paymentStatus: photographer.paymentStatus,
      status: photographer.status,
    });
  } catch (error) {
    next(error);
  }
};

const getSubscriptionAccessState = async (req, res, next) => {
  try {
    const { vendorId } = req.params;

    if (!req.user?.id || String(vendorId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, error: 'Unauthorized vendor access' });
    }

    const photographer = await Photographer.findById(vendorId);
    if (!photographer) {
      return res.status(404).json({ success: false, error: 'Vendor not found' });
    }

    const access = resolveSubscriptionAccessState(photographer);

    return res.status(200).json({
      success: true,
      vendorId: photographer._id.toString(),
      subPlan: photographer.subPlan || null,
      paymentStatus: photographer.paymentStatus || null,
      accessState: access.state,
      nextRoute: access.nextRoute,
      subscriptionStartDate: photographer.subscriptionStartDate,
      subscriptionEndDate: photographer.subscriptionEndDate,
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
