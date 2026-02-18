const express = require('express');
const router = express.Router();
const {
    createProposal,
    getVendorProposals,
    getPublicProposals,
    updateProposal,
    deleteProposal,
    getVendorStats,
    submitProposalRequest,
    getProposalRequests,
    updateRequestStatus,
} = require('../Controller/MarriageProposalController');

// Proposal routes
router.post('/create', createProposal);
router.get('/vendor', getVendorProposals);
router.get('/public', getPublicProposals);
router.put('/update', updateProposal);
router.delete('/delete', deleteProposal);
router.get('/stats', getVendorStats);

// Request routes
router.post('/request', submitProposalRequest);
router.get('/requests', getProposalRequests);
router.put('/request/status', updateRequestStatus);

module.exports = router;
