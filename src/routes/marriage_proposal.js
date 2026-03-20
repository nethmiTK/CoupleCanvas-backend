const express = require('express');
const router = express.Router();
const {
    createProposal,
    getVendorProposals,
    getPublicProposals,
    getProposalByAdCode,
    getAllProposalsAdmin,
    updateProposal,
    deleteProposal,
    getVendorStats,
    submitProposalRequest,
    getProposalRequests,
    updateRequestStatus,
} = require('../Controller/MarriageProposalController');

// Proposal routes - named routes MUST come before :adCode catch-all
router.post('/create', createProposal);
router.get('/vendor', getVendorProposals);
router.get('/public', getPublicProposals);
router.get('/admin/all', getAllProposalsAdmin);
router.get('/stats', getVendorStats);
router.put('/update', updateProposal);
router.delete('/delete', deleteProposal);

// Request routes
router.post('/request', submitProposalRequest);
router.get('/requests', getProposalRequests);
router.put('/request/status', updateRequestStatus);

// Catch-all - must be last
router.get('/:adCode', getProposalByAdCode);

module.exports = router;
