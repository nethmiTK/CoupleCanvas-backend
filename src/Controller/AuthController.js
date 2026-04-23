const Photographer = require('../models/Photographer');
const Proposal = require('../models/Proposal');
const { generateToken } = require('../utils/generateToken');
const { resolveSubscriptionAccessState } = require('./subscriptionController');

function normalizeVendorTypes(vendorTypes = []) {
  return Array.isArray(vendorTypes)
    ? vendorTypes.map((type) => (type === 'photographer' ? 'album' : type))
    : [];
}

function buildVendorAccounts({ photographer, proposalDoc, normalizedVendorTypes }) {
  const accounts = [];

  if (photographer && normalizedVendorTypes.some((type) => type === 'album' || type === 'photographer')) {
    accounts.push({
      vendorType: 'album',
      vendorId: photographer._id.toString(),
      collection: 'photographers',
      status: photographer.status,
      paymentStatus: photographer.paymentStatus || null,
    });
  }

  if (proposalDoc && normalizedVendorTypes.includes('proposal')) {
    accounts.push({
      vendorType: 'proposal',
      vendorId: proposalDoc._id.toString(),
      collection: 'proposals',
      status: proposalDoc.status,
      paymentStatus: proposalDoc.paymentStatus || null,
    });
  }

  return accounts;
}

/**
 * Register new vendor
 * Handles registration for photographers (album) and proposal vendors
 * 
 * @route POST /api/auth/register
 * @body {
 *   email: string,
 *   username: string,
 *   password: string,
 *   address: string,
 *   birthdate: string (YYYY-MM-DD),
 *   sex: string (male/female/other),
 *   vendorTypes: string[] (album/proposal),
 *   album: { name, whatsappNo },
 *   proposal: { name, whatsappNo }
 * }
 */
const register = async (req, res, next) => {
  try {
    const {
      email,
      username,
      password,
      address,
      birthdate,
      sex,
      vendorTypes,
      album,
      proposal,
    } = req.body;

    const normalizedVendorTypes = normalizeVendorTypes(vendorTypes);

    // ==================== VALIDATION ====================
    if (!email || !username || !password || !address || !birthdate || !sex) {
      return res.status(400).json({
        success: false,
        error: 'All basic fields are required',
      });
    }

    if (!Array.isArray(vendorTypes) || vendorTypes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one vendor type must be selected',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters',
      });
    }

    // ==================== DUPLICATE EMAIL CHECK ====================
    const existingPhotographer = await Photographer.findOne({ email: email.toLowerCase() });
    if (existingPhotographer) {
      return res.status(400).json({
        success: false,
        error: 'Email already registered as photographer',
      });
    }

    const existingProposal = await Proposal.findOne({ email: email.toLowerCase() });
    if (existingProposal) {
      return res.status(400).json({
        success: false,
        error: 'Email already registered for proposals',
      });
    }

    // ==================== SAVE TO PHOTOGRAPHERS (Album/Photographer/Proposal) ====================
    let photographer = null;
    const requiresPhotographerRecord =
      normalizedVendorTypes.includes('album') || normalizedVendorTypes.includes('proposal');

    if (requiresPhotographerRecord) {
      const photographerBusinessName =
        normalizedVendorTypes.includes('album') ? album?.name : proposal?.name || username;
      const photographerWhatsapp =
        normalizedVendorTypes.includes('album') ? album?.whatsappNo : proposal?.whatsappNo || '';

      if (normalizedVendorTypes.includes('album') && (!album || !album.name || !album.whatsappNo)) {
        return res.status(400).json({
          success: false,
          error: 'Album name and WhatsApp number are required',
        });
      }

      if (normalizedVendorTypes.includes('proposal') && (!proposal || !proposal.name || !proposal.whatsappNo)) {
        return res.status(400).json({
          success: false,
          error: 'Proposal name and WhatsApp number are required',
        });
      }

      photographer = await Photographer.create({
        email: email.toLowerCase(),
        username,
        password,
        address,
        birthdate: new Date(birthdate),
        sex,
        vendorTypes: normalizedVendorTypes,
        businessName: photographerBusinessName,
        whatsappNo: photographerWhatsapp,
        status: 'pending',
      });
    }

    // ==================== SAVE TO PROPOSALS ====================
    let proposalDoc = null;
    if (normalizedVendorTypes.includes('proposal')) {
      if (!proposal || !proposal.name || !proposal.whatsappNo) {
        return res.status(400).json({
          success: false,
          error: 'Proposal name and WhatsApp number are required',
        });
      }

      proposalDoc = await Proposal.create({
        email: email.toLowerCase(),
        username,
        name: proposal.name,
        whatsappNo: proposal.whatsappNo,
        address,
        birthdate: new Date(birthdate),
        sex,
        status: 'pending',
      });
    }

    // ==================== GENERATE TOKEN ====================
    const vendorId = photographer ? photographer._id : proposalDoc._id;
    const token = generateToken(vendorId.toString(), 'vendor');
    const vendorAccounts = buildVendorAccounts({ photographer, proposalDoc, normalizedVendorTypes });
    const access = photographer
      ? resolveSubscriptionAccessState(photographer, 'album')
      : resolveSubscriptionAccessState(proposalDoc, 'proposal');

    // ==================== RESPONSE ====================
    res.status(201).json({
      success: true,
      vendorId: vendorId.toString(),
      email: email.toLowerCase(),
      username,
      vendorTypes,
      vendorAccounts,
      status: 'pending',
      nextRoute: access.nextRoute,
      token,
      message: 'Registration successful. Please wait for approval.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login photographer/vendor
 * 
 * @route POST /api/auth/login
 * @body { email: string, password: string }
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    // Try to find in photographers collection
    const photographer = await Photographer.findOne({ email: email.toLowerCase() }).select('+password');

    if (photographer) {
      const isPasswordValid = await photographer.comparePassword(password);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
        });
      }

      const proposalDoc = photographer.vendorTypes?.includes('proposal')
        ? await Proposal.findOne({ email: photographer.email.toLowerCase() })
        : null;
      const vendorAccounts = buildVendorAccounts({
        photographer,
        proposalDoc,
        normalizedVendorTypes: normalizeVendorTypes(photographer.vendorTypes),
      });
      const token = generateToken(photographer._id.toString(), 'vendor');
      
      // Separate access states for each account
      const accountsWithAccess = vendorAccounts.map(acc => {
        const accAccess = resolveSubscriptionAccessState(
          acc.vendorType === 'proposal' && proposalDoc ? proposalDoc : photographer,
          acc.vendorType
        );
        return {
          ...acc,
          accessState: accAccess.state,
          nextRoute: accAccess.nextRoute
        };
      });

      // Default access for the overall login response (prioritize active/pending over no_plan)
      const primaryAccount = accountsWithAccess.find(a => a.accessState === 'active') || accountsWithAccess[0];

      // Update last login
      photographer.lastLogin = new Date();
      await photographer.save();

      return res.status(200).json({
        success: true,
        vendorId: photographer._id.toString(),
        email: photographer.email,
        username: photographer.username,
        vendorTypes: photographer.vendorTypes,
        status: photographer.status,
        businessName: photographer.businessName,
        subPlan: photographer.subPlan || null,
        paymentStatus: photographer.paymentStatus || null,
        subscriptionStartDate: photographer.subscriptionStartDate || null,
        subscriptionEndDate: photographer.subscriptionEndDate || null,
        vendorAccounts: accountsWithAccess,
        accessState: primaryAccount.accessState,
        nextRoute: primaryAccount.nextRoute,
        token,
      });
    }

    // If not found in photographers
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials or user not found',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current vendor profile
 * 
 * @route GET /api/auth/me
 * @header Authorization: Bearer <token>
 */
const getProfile = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
    }

    const photographer = await Photographer.findById(req.user.id);

    if (!photographer) {
      return res.status(404).json({
        success: false,
        error: 'Photographer not found',
      });
    }

    res.status(200).json({
      success: true,
      data: photographer,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update vendor profile
 * 
 * @route PUT /api/auth/profile/update
 * @header Authorization: Bearer <token>
 */
const updateProfile = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
    }

    const { username, businessName, whatsappNo, contactNo, address, bio } = req.body;

    const photographer = await Photographer.findById(req.user.id);
    if (!photographer) {
      return res.status(404).json({
        success: false,
        error: 'Photographer not found',
      });
    }

    // Update fields
    if (username) photographer.username = username;
    if (businessName !== undefined) photographer.businessName = businessName;
    if (whatsappNo !== undefined) photographer.whatsappNo = whatsappNo;
    if (contactNo !== undefined) photographer.contactNo = contactNo;
    if (address !== undefined) photographer.address = address;
    if (bio !== undefined) photographer.bio = bio;

    await photographer.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: photographer,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
};
