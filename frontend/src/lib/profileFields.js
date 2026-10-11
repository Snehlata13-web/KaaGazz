/**
 * Editable profile fields per role. These mirror
 * `DbService.editableProfileFields` on the backend — email, role, and approval
 * status are deliberately not editable, since email is the account lookup key
 * and approval is an admin decision.
 */
export const PROFILE_FIELDS_BY_ROLE = {
  institution: [
    { name: 'name', label: 'Institution name' },
    { name: 'category', label: 'Institution type', type: 'select', options: [['SCHOOL', 'School'], ['COLLEGE', 'College / university']] },
    { name: 'department', label: 'Department' },
    { name: 'contactPerson', label: 'Contact person' },
    { name: 'phone', label: 'Phone' },
    { name: 'city', label: 'City' },
    { name: 'address', label: 'Address', full: true },
  ],
  ngo: [
    { name: 'name', label: 'Organisation name' },
    { name: 'registrationNumber', label: 'Registration number' },
    { name: 'contactPerson', label: 'Contact person' },
    { name: 'phone', label: 'Phone' },
    { name: 'city', label: 'City' },
    { name: 'address', label: 'Address', full: true },
  ],
  recycler: [
    { name: 'companyName', label: 'Company name' },
    { name: 'capacityTonsPerDay', label: 'Daily capacity (tons)', type: 'number', min: '0.1', step: '0.1' },
    { name: 'contactPerson', label: 'Contact person' },
    { name: 'phone', label: 'Phone' },
    { name: 'city', label: 'City' },
    { name: 'address', label: 'Address', full: true },
  ],
}

/** The platform admin has no editable partner record. */
export const canEditProfile = (role) => Boolean(PROFILE_FIELDS_BY_ROLE[role])
