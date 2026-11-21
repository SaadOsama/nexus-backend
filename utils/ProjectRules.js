// Status rules: sab kuch ek hi jagah define hai.
// Published = 'approved'. Approved project ko owner edit ya delete nahi kar sakta.

const OWNER_EDITABLE = ['draft', 'changes_requested'];
const OWNER_DELETABLE = ['draft'];
const OWNER_SUBMITTABLE = ['draft', 'changes_requested'];

const REVIEW_ACTIONS = {
  approve: 'approved',
  request_changes: 'changes_requested',
  reject: 'rejected',
};

module.exports = {
  OWNER_EDITABLE,
  OWNER_DELETABLE,
  OWNER_SUBMITTABLE,
  REVIEW_ACTIONS,
};