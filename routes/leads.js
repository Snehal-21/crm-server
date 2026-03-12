const express = require('express');
const router = express.Router();
const {
  createLead, getLeads, getLeadById,
  updateLead, deleteLead, getStats
} = require('../controllers/leadController');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/rbac');
const { validateLead } = require('../middlewares/validate');

router.use(authenticate);

// Stats must come before /:id to avoid route conflict
router.get('/stats/summary', authorize('dashboard:read'), getStats);

router.get('/', authorize('lead:read'), getLeads);
router.post('/', authorize('lead:write'), validateLead, createLead);
router.get('/:id', authorize('lead:read'), getLeadById);
router.patch('/:id', authorize('lead:write'), validateLead, updateLead);
router.delete('/:id', authorize('lead:delete'), deleteLead);

module.exports = router;
