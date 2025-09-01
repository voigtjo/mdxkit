import { useAuth } from '../context/AuthContext';

export const PERMS = {
  FORM_CREATE: 'form:create',
  FORM_PUBLISH: 'form:publish',
  FORM_ASSIGN: 'form:assign',
  FORM_ASSIGN_TEMPLATES: 'form:assign_templates',
  FORMDATA_EDIT: 'formdata:edit',
  FORMDATA_PUBLISH: 'formdata:publish',
};

const ROLE_PERMS = {
  Viewer: [],
  Operator: [PERMS.FORMDATA_EDIT],
  FormAuthor: [PERMS.FORM_CREATE, PERMS.FORM_ASSIGN_TEMPLATES],
  FormPublisher: [PERMS.FORM_PUBLISH],
  FormDataEditor: [PERMS.FORMDATA_EDIT],
  FormDataApprover: [PERMS.FORMDATA_PUBLISH],
  Admin: [
    PERMS.FORM_CREATE,
    PERMS.FORM_PUBLISH,
    PERMS.FORM_ASSIGN,
    PERMS.FORM_ASSIGN_TEMPLATES,
    PERMS.FORMDATA_EDIT,
    PERMS.FORMDATA_PUBLISH,
  ],
};

export default function usePerms() {
  const { user } = useAuth();
  if (!user) return { can: () => false };

  if (user.isSystemAdmin || user.isTenantAdmin) {
    return { can: () => true };
  }

  const roles = (user.memberships || []).flatMap(m => m.roles || []);
  const perms = new Set();
  roles.forEach(r => (ROLE_PERMS[r] || []).forEach(p => perms.add(p)));

  return { can: (perm) => perms.has(perm) };
}
