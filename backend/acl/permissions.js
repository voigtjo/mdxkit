/**
 * Phase 1 stub: canonical permissions and role mapping.
 * Extend safely in later phases.
 */
export const PERMS = {
  FORM_CREATE: 'form:create',
  FORM_PUBLISH: 'form:publish',
  FORM_ASSIGN: 'form:assign',
  FORMDATA_EDIT: 'formdata:edit',
  FORMDATA_PUBLISH: 'formdata:publish',
};

export const ROLE_PERMS = {
  Viewer: [],
  Operator: [PERMS.FORMDATA_EDIT],
  Moderator: [PERMS.FORMDATA_EDIT, PERMS.FORM_PUBLISH, PERMS.FORM_ASSIGN],
  Admin: [
    PERMS.FORM_CREATE,
    PERMS.FORM_PUBLISH,
    PERMS.FORM_ASSIGN,
    PERMS.FORMDATA_EDIT,
    PERMS.FORMDATA_PUBLISH,
  ],
};
