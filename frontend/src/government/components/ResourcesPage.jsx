import { useEffect, useMemo, useState } from 'react';
import { createResource, getResources, updateResource } from '../api/client.js';

const emptyResource = { name: '', type: '', quantity: '', location: '', status: '' };
const locationText = (location) => typeof location === 'string' ? location : location == null ? '' : JSON.stringify(location);
const displayLocation = (location) => locationText(location) || 'Not available';
const parseLocation = (value) => {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  try { return JSON.parse(trimmed); } catch { return value; }
};

function ResourceForm({ title, value, onChange, onSubmit, onCancel, submitting, message, isEdit }) {
  return <form className="resource-form" onSubmit={onSubmit}>
    <div className="form-heading"><h3>{title}</h3>{onCancel && <button className="close-form" type="button" onClick={onCancel}>Close</button>}</div>
    <label htmlFor={`${isEdit ? 'edit' : 'new'}-resource-name`}>Resource name</label>
    <input id={`${isEdit ? 'edit' : 'new'}-resource-name`} value={value.name} onChange={(event) => onChange('name', event.target.value)} required />
    <label htmlFor={`${isEdit ? 'edit' : 'new'}-resource-type`}>Type</label>
    <input id={`${isEdit ? 'edit' : 'new'}-resource-type`} value={value.type} onChange={(event) => onChange('type', event.target.value)} required />
    <label htmlFor={`${isEdit ? 'edit' : 'new'}-resource-quantity`}>Quantity</label>
    <input id={`${isEdit ? 'edit' : 'new'}-resource-quantity`} type="number" min="0" step="any" value={value.quantity} onChange={(event) => onChange('quantity', event.target.value)} required />
    <label htmlFor={`${isEdit ? 'edit' : 'new'}-resource-location`}>Location</label>
    <textarea id={`${isEdit ? 'edit' : 'new'}-resource-location`} value={value.location} onChange={(event) => onChange('location', event.target.value)} required />
    <label htmlFor={`${isEdit ? 'edit' : 'new'}-resource-status`}>Status</label>
    <input id={`${isEdit ? 'edit' : 'new'}-resource-status`} value={value.status} onChange={(event) => onChange('status', event.target.value)} required />
    <button className="primary-action" type="submit" disabled={submitting}>{submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add resource'}</button>
    {message && <p className={`inline-message ${message.type === 'error' ? 'error' : ''}`}>{message.text}</p>}
  </form>;
}

function ResourcesPage() {
  const [resources, setResources] = useState([]);
  const [resourceState, setResourceState] = useState('loading');
  const [resourceError, setResourceError] = useState('');
  const [filters, setFilters] = useState({ status: '', type: '' });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createValue, setCreateValue] = useState(emptyResource);
  const [createState, setCreateState] = useState('idle');
  const [createMessage, setCreateMessage] = useState(null);
  const [editingResource, setEditingResource] = useState(null);
  const [editValue, setEditValue] = useState(emptyResource);
  const [editState, setEditState] = useState('idle');
  const [editMessage, setEditMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const refreshResources = async () => {
    setResourceState('loading'); setResourceError('');
    try {
      const data = await getResources();
      if (!Array.isArray(data)) throw new Error('The backend returned an unexpected resources format.');
      setResources(data); setResourceState('ready'); return data;
    } catch (error) {
      setResources([]); setResourceState('error'); setResourceError(error.message || 'Unable to load resources.'); return [];
    }
  };

  useEffect(() => { refreshResources(); }, []);

  const filterOptions = useMemo(() => ({
    statuses: [...new Set(resources.map((resource) => resource.status).filter(Boolean))],
    types: [...new Set(resources.map((resource) => resource.type).filter(Boolean))],
  }), [resources]);
  const filteredResources = resources.filter((resource) => (!filters.status || resource.status === filters.status) && (!filters.type || resource.type === filters.type));

  const validate = (value) => {
    const quantity = Number(value.quantity);
    if (!Number.isFinite(quantity) || quantity < 0) return 'Quantity must be a non-negative number.';
    return '';
  };
  const setCreateField = (field, nextValue) => setCreateValue((current) => ({ ...current, [field]: nextValue }));
  const setEditField = (field, nextValue) => setEditValue((current) => ({ ...current, [field]: nextValue }));

  const submitCreate = async (event) => {
    event.preventDefault(); setCreateMessage(null); setSuccessMessage('');
    const validationError = validate(createValue);
    if (validationError) { setCreateMessage({ type: 'error', text: validationError }); return; }
    setCreateState('saving');
    try {
      await createResource({ ...createValue, quantity: Number(createValue.quantity), location: parseLocation(createValue.location) });
      setCreateValue(emptyResource); setShowCreateForm(false); setCreateState('idle'); setSuccessMessage('Resource created successfully.');
      await refreshResources();
    } catch (error) {
      setCreateState('idle'); setCreateMessage({ type: 'error', text: error.message || 'Unable to create the resource.' });
    }
  };

  const beginEdit = (resource) => {
    setSuccessMessage(''); setEditMessage(null); setEditingResource(resource);
    setEditValue({ name: resource.name || '', type: resource.type || '', quantity: String(resource.quantity ?? ''), location: locationText(resource.location), status: resource.status || '' });
  };

  const submitEdit = async (event) => {
    event.preventDefault();
    if (!editingResource) return;
    setEditMessage(null); setSuccessMessage('');
    const validationError = validate(editValue);
    if (validationError) { setEditMessage({ type: 'error', text: validationError }); return; }
    const baseline = { name: editingResource.name || '', type: editingResource.type || '', quantity: String(editingResource.quantity ?? ''), location: locationText(editingResource.location), status: editingResource.status || '' };
    const updates = {};
    ['name', 'type', 'status'].forEach((field) => { if (editValue[field] !== baseline[field]) updates[field] = editValue[field]; });
    if (Number(editValue.quantity) !== Number(baseline.quantity)) updates.quantity = Number(editValue.quantity);
    if (editValue.location !== baseline.location) updates.location = parseLocation(editValue.location);
    if (!Object.keys(updates).length) { setEditMessage({ type: 'error', text: 'Change at least one field before saving.' }); return; }
    setEditState('saving');
    try {
      const updated = await updateResource(editingResource.resource_id, updates);
      setResources((current) => current.map((resource) => resource.resource_id === updated.resource_id ? updated : resource));
      setEditingResource(null); setEditState('idle'); setSuccessMessage('Resource updated successfully.');
      await refreshResources();
    } catch (error) {
      setEditState('idle'); setEditMessage({ type: 'error', text: error.message || 'Unable to update the resource.' });
    }
  };

  return <section className="resources-page">
    <div className="page-heading resources-heading"><div><p className="eyebrow">Response capacity</p><h2>Resources</h2><p>Maintain the current inventory available to emergency response operations.</p></div><button className="primary-action" type="button" onClick={() => { setShowCreateForm((current) => !current); setCreateMessage(null); setSuccessMessage(''); }}>{showCreateForm ? 'Close add resource' : 'Add resource'}</button></div>
    {successMessage && <p className="page-success">{successMessage}</p>}
    {showCreateForm && <ResourceForm title="Add Resource" value={createValue} onChange={setCreateField} onSubmit={submitCreate} onCancel={() => setShowCreateForm(false)} submitting={createState === 'saving'} message={createMessage} />}
    <section className="resources-panel">
      <div className="filter-row resource-filter-row"><label>Status<select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}><option value="">All statuses</option>{filterOptions.statuses.map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label>Type<select value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}><option value="">All types</option>{filterOptions.types.map((value) => <option key={value} value={value}>{value}</option>)}</select></label></div>
      {resourceState === 'loading' && <p className="section-message">Loading resources…</p>}
      {resourceState === 'error' && <p className="section-message error">{resourceError}</p>}
      {resourceState === 'ready' && resources.length === 0 && <p className="section-message">No resources are currently registered.</p>}
      {resourceState === 'ready' && resources.length > 0 && filteredResources.length === 0 && <p className="section-message">No resources match the selected filters.</p>}
      {resourceState === 'ready' && filteredResources.length > 0 && <div className="data-table-wrap"><table><thead><tr><th>Resource name</th><th>Type</th><th>Quantity</th><th>Location</th><th>Status</th><th>Updated</th><th>Action</th></tr></thead><tbody>{filteredResources.map((resource) => <tr key={resource.resource_id}><td>{resource.name}</td><td>{resource.type}</td><td>{resource.quantity}</td><td className="resource-location">{displayLocation(resource.location)}</td><td><span className="tag status">{resource.status}</span></td><td>{resource.updated_at ? new Date(resource.updated_at).toLocaleString() : 'Not available'}</td><td><button className="table-action" type="button" onClick={() => beginEdit(resource)}>Edit</button></td></tr>)}</tbody></table></div>}
    </section>
    {editingResource && <ResourceForm title={`Edit ${editingResource.name}`} value={editValue} onChange={setEditField} onSubmit={submitEdit} onCancel={() => { setEditingResource(null); setEditMessage(null); }} submitting={editState === 'saving'} message={editMessage} isEdit />}
  </section>;
}

export default ResourcesPage;
