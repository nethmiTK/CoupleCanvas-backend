const { getDb } = require('../db/mongo');
const { ObjectId } = require('mongodb');

// Generate unique ad code (format: 4Y8D4W)
function generateAdCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Create new proposal (Ad)
const createProposal = async (req, res) => {
  const db = getDb();
  try {
    const {
      vendorId,
      // Section 01 - Private (not published)
      firstName,
      lastName,
      whatsappContact,
      otherContact,
      address,
      userId, // WhatsApp Number (USER ID)
      // Section 02 - Public (published)
      gender,
      birthYear,
      caste,
      profession,
      status,
      telephoneNumber,
      proposalFor,
      birthTown,
      residentCountry,
      residentProvince,
      residentDistrict,
      residentTown,
      heightFeet,
      heightInches,
      moreAbout,
      language, // 'english' or 'sinhala'
      generatedDescription,
      password,
      adImage,
      albumTheme,
    } = req.body;

    // Validation
    if (!firstName || !lastName || !gender || !birthYear || !telephoneNumber) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const adCode = generateAdCode();

    const proposal = {
      vendorId: vendorId ? new ObjectId(vendorId) : null,
      adCode,

      // Section 01 - Private
      privateInfo: {
        firstName,
        lastName,
        whatsappContact,
        otherContact,
        address,
        userId,
      },

      // Section 02 - Public
      publicInfo: {
        gender,
        birthYear: parseInt(birthYear),
        caste,
        profession,
        status,
        telephoneNumber,
        proposalFor,
        birthTown,
        residentCountry,
        residentProvince,
        residentDistrict,
        residentTown,
        height: {
          feet: parseInt(heightFeet) || 0,
          inches: parseInt(heightInches) || 0,
        },
        moreAbout,
        language,
        generatedDescription,
      },
      adImage,
      albumDesign: albumTheme || 'romantic',
      password, // Store hashed in production
      approvalStatus: 'approved', // Vendors' proposals are auto-approved
      adStatus: 'active', // Start as active instead of draft
      createdAt: new Date(),
      updatedAt: new Date(),
      views: 0,
    };

    const result = await db.collection('marriage_proposals').insertOne(proposal);

    res.status(201).json({
      success: true,
      message: 'Proposal created successfully',
      proposalId: result.insertedId,
      adCode,
    });
  } catch (error) {
    console.error('Error creating proposal:', error);
    res.status(500).json({ error: error.message || 'Failed to create proposal' });
  }
};

// Get vendor's proposals (My Ads)
const getVendorProposals = async (req, res) => {
  const db = getDb();
  try {
    const { vendorId } = req.query;

    if (!vendorId) {
      return res.status(400).json({ error: 'Vendor ID is required' });
    }

    const proposals = await db.collection('marriage_proposals')
      .find({ vendorId: new ObjectId(vendorId) })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ success: true, proposals });
  } catch (error) {
    console.error('Error fetching vendor proposals:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch proposals' });
  }
};

// Get public proposals (for listing page)
const getPublicProposals = async (req, res) => {
  const db = getDb();
  try {
    const { gender, birthYear, status, country, province, district, town, minHeight, maxHeight } = req.query;

    const filter = {
      approvalStatus: 'approved',
      adStatus: 'active',
    };

    if (gender) filter['publicInfo.gender'] = gender;
    if (birthYear) filter['publicInfo.birthYear'] = parseInt(birthYear);
    if (req.query.age) filter['publicInfo.birthYear'] = new Date().getFullYear() - parseInt(req.query.age);
    if (status) filter['publicInfo.status'] = status;
    if (country) filter['publicInfo.residentCountry'] = country;
    if (province) filter['publicInfo.residentProvince'] = province;
    if (district) filter['publicInfo.residentDistrict'] = { $regex: district, $options: 'i' };
    if (town) filter['publicInfo.residentTown'] = town;
    if (req.query.profession) filter['publicInfo.profession'] = { $regex: req.query.profession, $options: 'i' };

    const proposals = await db.collection('marriage_proposals')
      .find(filter)
      .project({
        adCode: 1,
        publicInfo: 1,
        createdAt: 1,
        views: 1,
        hearts: 1,
        albumDesign: 1,
        adImage: 1,
      })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ success: true, proposals });
  } catch (error) {
    console.error('Error fetching public proposals:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch proposals' });
  }
};

// Update proposal
const updateProposal = async (req, res) => {
  const db = getDb();
  try {
    const { proposalId, adStatus, ...updateData } = req.body;

    if (!proposalId) {
      return res.status(400).json({ error: 'Proposal ID is required' });
    }

    const update = { $set: { updatedAt: new Date() } };

    // Separate regular fields for $set and operators like $inc
    Object.keys(updateData).forEach(key => {
      if (key.startsWith('$')) {
        update[key] = updateData[key];
      } else {
        update.$set[key] = updateData[key];
      }
    });

    if (adStatus) update.$set.adStatus = adStatus;

    const result = await db.collection('marriage_proposals').updateOne(
      { _id: new ObjectId(proposalId) },
      update
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    res.json({ success: true, message: 'Proposal updated successfully' });
  } catch (error) {
    console.error('Error updating proposal:', error);
    res.status(500).json({ error: error.message || 'Failed to update proposal' });
  }
};

// Get vendor stats
const getVendorStats = async (req, res) => {
  const db = getDb();
  try {
    const { vendorId } = req.query;

    if (!vendorId) {
      return res.status(400).json({ error: 'Vendor ID is required' });
    }

    const [activeAds, pendingApprovals, totalViews, todayRequests] = await Promise.all([
      db.collection('marriage_proposals').countDocuments({
        vendorId: new ObjectId(vendorId),
        adStatus: 'active',
      }),
      db.collection('marriage_proposals').countDocuments({
        vendorId: new ObjectId(vendorId),
        approvalStatus: 'pending',
      }),
      db.collection('marriage_proposals').aggregate([
        { $match: { vendorId: new ObjectId(vendorId) } },
        { $group: { _id: null, total: { $sum: '$views' } } },
      ]).toArray(),
      db.collection('proposal_requests').countDocuments({
        vendorId: new ObjectId(vendorId),
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      }),
    ]);

    res.json({
      success: true,
      stats: {
        activeAds,
        pendingApprovals,
        totalViews: totalViews[0]?.total || 0,
        todayRequests,
      },
    });
  } catch (error) {
    console.error('Error fetching vendor stats:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch stats' });
  }
};

// Submit proposal request (from public)
const submitProposalRequest = async (req, res) => {
  const db = getDb();
  try {
    const {
      adCode,
      name,
      birthYear,
      proposalFor,
      caste,
      heightFeet,
      heightInches,
      birthCity,
      currentCity,
      job,
      maritalStatus,
      whatsapp,
      phone2,
      extraDetails,
      aboutMe,
    } = req.body;

    if (!adCode || !name || !birthYear) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get the proposal to find vendorId
    const proposal = await db.collection('marriage_proposals').findOne({ adCode });

    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    const request = {
      proposalId: proposal._id,
      adCode,
      vendorId: proposal.vendorId,
      requesterInfo: {
        name,
        birthYear: parseInt(birthYear),
        proposalFor,
        caste,
        height: {
          feet: parseInt(heightFeet) || 0,
          inches: parseInt(heightInches) || 0,
        },
        birthCity,
        currentCity,
        job,
        maritalStatus,
        whatsapp,
        phone2,
        extraDetails,
        aboutMe,
      },
      status: 'new', // new, contacted, accepted, rejected
      vendorNotes: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('proposal_requests').insertOne(request);

    res.status(201).json({
      success: true,
      message: 'Proposal request submitted successfully',
      requestId: result.insertedId,
    });
  } catch (error) {
    console.error('Error submitting proposal request:', error);
    res.status(500).json({ error: error.message || 'Failed to submit request' });
  }
};

// Get proposal requests (Vendor's inbox)
const getProposalRequests = async (req, res) => {
  const db = getDb();
  try {
    const { vendorId, adCode, status, dateFrom, dateTo } = req.query;

    if (!vendorId) {
      return res.status(400).json({ error: 'Vendor ID is required' });
    }

    const filter = { vendorId: new ObjectId(vendorId) };

    if (adCode) filter.adCode = adCode;
    if (status) filter.status = status;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const requests = await db.collection('proposal_requests')
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ success: true, requests });
  } catch (error) {
    console.error('Error fetching proposal requests:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch requests' });
  }
};

// Update request status
const updateRequestStatus = async (req, res) => {
  const db = getDb();
  try {
    const { requestId, status, vendorNotes } = req.body;

    if (!requestId) {
      return res.status(400).json({ error: 'Request ID is required' });
    }

    const update = {
      $set: {
        status,
        updatedAt: new Date(),
      },
    };

    if (vendorNotes !== undefined) {
      update.$set.vendorNotes = vendorNotes;
    }

    const result = await db.collection('proposal_requests').updateOne(
      { _id: new ObjectId(requestId) },
      update
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    res.json({ success: true, message: 'Request updated successfully' });
  } catch (error) {
    console.error('Error updating request:', error);
    res.status(500).json({ error: error.message || 'Failed to update request' });
  }
};

// Delete proposal
const deleteProposal = async (req, res) => {
  const db = getDb();
  try {
    const { proposalId } = req.body;

    if (!proposalId) {
      return res.status(400).json({ error: 'Proposal ID is required' });
    }

    const result = await db.collection('marriage_proposals').deleteOne({
      _id: new ObjectId(proposalId),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    // Also delete all related proposal requests
    await db.collection('proposal_requests').deleteMany({
      proposalId: new ObjectId(proposalId),
    });

    res.json({ success: true, message: 'Proposal deleted successfully' });
  } catch (error) {
    console.error('Error deleting proposal:', error);
    res.status(500).json({ error: error.message || 'Failed to delete proposal' });
  }
};

// Admin: Get all proposals
const getAllProposalsAdmin = async (req, res) => {
  const db = getDb();
  try {
    const { status, approvalStatus, search } = req.query;

    const filter = {};
    if (status && status !== 'all') filter.adStatus = status;
    if (approvalStatus && approvalStatus !== 'all') filter.approvalStatus = approvalStatus;

    if (search) {
      filter.$or = [
        { adCode: { $regex: search, $options: 'i' } },
        { 'privateInfo.firstName': { $regex: search, $options: 'i' } },
        { 'privateInfo.lastName': { $regex: search, $options: 'i' } },
      ];
    }

    const proposals = await db.collection('marriage_proposals')
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ success: true, proposals });
  } catch (error) {
    console.error('Error fetching all proposals:', error);
    res.status(500).json({ error: 'Failed to fetch proposals' });
  }
};

module.exports = {
  createProposal,
  getVendorProposals,
  getPublicProposals,
  getAllProposalsAdmin,
  updateProposal,
  deleteProposal,
  getVendorStats,
  submitProposalRequest,
  getProposalRequests,
  updateRequestStatus,
};
