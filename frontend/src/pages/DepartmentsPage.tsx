import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/auth.store';
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from '../services/department';
import { getUsers, updateUser } from '../services/user';
import { getClients } from '../services/client';
import type { Department, OrgUser, Client } from '../types';
import {
  Plus,
  Trash2,
  Edit3,
  ChevronRight,
  ChevronDown,
  Building2,
  Users,
  Check,
  X,
  RefreshCw,
  Link2,
} from 'lucide-react';
import clsx from 'clsx';

export default function DepartmentsPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string | undefined>(undefined);

  const loadData = async (orgId?: string) => {
    try {
      const fetchOrgId = isSuperAdmin ? orgId || selectedOrgId : undefined;
      const [depts, usrs, cls] = await Promise.all([
        getDepartments(fetchOrgId),
        getUsers(fetchOrgId),
        isSuperAdmin ? getClients() : Promise.resolve([]),
      ]);
      setDepartments(depts);
      setUsers(usrs);
      if (isSuperAdmin) setClients(cls);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin && clients.length > 0 && !selectedOrgId) {
      const firstOrgId = clients[0].organizationId;
      setSelectedOrgId(firstOrgId);
      loadData(firstOrgId);
    } else if (!isSuperAdmin) {
      loadData();
    }
  }, [isSuperAdmin]);

  const activeOrgId = isSuperAdmin ? selectedOrgId : undefined;

  const handleClientChange = (orgId: string) => {
    setSelectedOrgId(orgId);
    setExpandedIds(new Set());
    setLoading(true);
    loadData(orgId);
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this department?')) return;
    try {
      await deleteDepartment(id, activeOrgId);
      loadData(activeOrgId);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete');
    }
  };

  const handleAssignUser = async (userId: string, departmentId: string | null) => {
    try {
      await updateUser(userId, { departmentId: departmentId || '' } as any);
      loadData(activeOrgId);
    } catch {}
  };

  const buildTree = (parentId: string | null, level: number): React.ReactNode => {
    const children = departments.filter((d) => d.parentId === parentId);
    if (children.length === 0 && parentId !== null) return null;

    return (
      <div className={level > 0 ? 'ml-6 border-l border-bc-border pl-3' : ''}>
        {children.map((dept) => {
          const hasChildren = departments.some((d) => d.parentId === dept.id);
          const isExpanded = expandedIds.has(dept.id);
          const deptUsers = users.filter((u) => (u as any).department?.id === dept.id);

          return (
            <div key={dept.id} className="mb-1">
              <div className="group flex items-center gap-2 rounded-lg px-3 py-2.5 transition-all hover:bg-bc-bg-muted">
                {hasChildren ? (
                  <button onClick={() => toggleExpand(dept.id)} className="shrink-0 text-bc-text-muted">
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                ) : (
                  <span className="w-3.5 shrink-0" />
                )}

                <Building2 size={16} className="shrink-0 text-bc-primary" />

                {editingId === dept.id ? (
                  <InlineEdit
                    dept={dept}
                    departments={departments}
                    onSave={async (name, parentId) => {
                      await updateDepartment(dept.id, { name, parentId }, activeOrgId);
                      setEditingId(null);
                      loadData(activeOrgId);
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-bc-text-dark truncate">{dept.name}</p>
                      <p className="text-[10px] text-bc-text-muted">
                        {deptUsers.length} user · Level {dept.level}
                        {dept.parent && ` · Parent: ${dept.parent.name}`}
                      </p>
                    </div>

                    {deptUsers.length > 0 && (
                      <div className="flex -space-x-1.5">
                        {deptUsers.slice(0, 3).map((u) => (
                          <div
                            key={u.id}
                            className="flex h-5 w-5 items-center justify-center rounded-full bg-bc-primary/10 text-[8px] font-medium text-bc-primary border border-white"
                            title={u.name || u.email}
                          >
                            {u.name?.[0]?.toUpperCase() || u.email[0]?.toUpperCase()}
                          </div>
                        ))}
                        {deptUsers.length > 3 && (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-bc-bg-muted text-[8px] text-bc-text-muted border border-white">
                            +{deptUsers.length - 3}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => { setCreateParentId(dept.id); setShowCreate(true); }}
                        className="rounded p-1 text-bc-text-muted hover:text-bc-primary hover:bg-bc-primary/10"
                        title="Add sub-department"
                      >
                        <Plus size={12} />
                      </button>
                      <button
                        onClick={() => setEditingId(dept.id)}
                        className="rounded p-1 text-bc-text-muted hover:text-bc-primary hover:bg-bc-primary/10"
                        title="Edit"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        onClick={() => handleDelete(dept.id)}
                        className="rounded p-1 text-bc-text-muted hover:text-red-500 hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </>
                )}
              </div>

              {hasChildren && isExpanded && buildTree(dept.id, level + 1)}

              {isExpanded && deptUsers.length > 0 && (
                <div className="ml-10 mb-2 space-y-0.5">
                  {deptUsers.map((u) => (
                    <div key={u.id} className="flex items-center gap-2 rounded px-2 py-1 text-xs text-bc-text-secondary hover:bg-bc-bg-muted">
                      <Users size={10} className="shrink-0 text-bc-text-muted" />
                      <span className="truncate">{u.name || u.email}</span>
                      {u.position && <span className="text-bc-text-muted">({u.position})</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const unassignedUsers = users.filter((u) => !(u as any).department);
  const selectedClient = clients.find((c) => c.organizationId === selectedOrgId);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between border-b border-bc-border px-6 py-4">
        <div>
          <h1 className="text-lg font-bold text-bc-text-dark">Org Structure</h1>
          <p className="text-xs text-bc-text-muted mt-0.5">
            {departments.length} departments · {users.length} users
            {selectedClient && (
              <span className="ml-2 inline-flex items-center gap-1 text-bc-primary">
                <Link2 size={10} /> {selectedClient.name}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSuperAdmin && clients.length > 0 && (
            <select
              value={selectedOrgId || ''}
              onChange={(e) => handleClientChange(e.target.value)}
              className="rounded-lg border border-bc-border bg-white px-3 py-1.5 text-xs outline-none focus:border-bc-primary"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.organizationId}>{c.name}</option>
              ))}
            </select>
          )}
          <button onClick={() => loadData(activeOrgId)} className="rounded-lg p-2 text-bc-text-muted hover:bg-bc-bg-muted transition-colors">
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => { setCreateParentId(null); setShowCreate(!showCreate); }}
            className="flex items-center gap-1 rounded-lg bg-bc-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-bc-primary-dark transition-all"
          >
            <Plus size={12} /> New Department
          </button>
        </div>
      </div>

      {showCreate && (
        <CreateDepartmentForm
          departments={departments}
          defaultParentId={createParentId}
          orgId={activeOrgId}
          onDone={() => { setShowCreate(false); setCreateParentId(null); loadData(activeOrgId); }}
        />
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="text-center text-xs text-bc-text-muted py-8">Loading...</div>
        ) : departments.length === 0 ? (
          <div className="text-center py-12">
            <Building2 size={48} className="mx-auto mb-3 text-bc-text-muted" />
            <h3 className="text-sm font-semibold text-bc-text-secondary">No departments yet</h3>
            <p className="mt-1 text-xs text-bc-text-muted">Create your first department to start building the org structure.</p>
          </div>
        ) : (
          <>
            {buildTree(null, 0)}

            {unassignedUsers.length > 0 && (
              <div className="mt-6 pt-4 border-t border-bc-border">
                <p className="text-xs font-semibold text-bc-text-muted mb-2">
                  Unassigned Users ({unassignedUsers.length})
                </p>
                <div className="space-y-1">
                  {unassignedUsers.map((u) => (
                    <div key={u.id} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-bc-bg-muted group">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-bc-bg-muted text-[10px] text-bc-text-muted">
                        {u.name?.[0]?.toUpperCase() || u.email[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-bc-text-dark truncate">{u.name || u.email}</p>
                      </div>
                      <select
                        value=""
                        onChange={(e) => { if (e.target.value) handleAssignUser(u.id, e.target.value); }}
                        className="rounded border border-bc-border bg-white px-2 py-1 text-[10px] outline-none opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <option value="">Assign to dept...</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function CreateDepartmentForm({
  departments,
  defaultParentId,
  orgId,
  onDone,
}: {
  departments: Department[];
  defaultParentId: string | null;
  orgId?: string;
  onDone: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState(defaultParentId || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setParentId(defaultParentId || '');
  }, [defaultParentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setLoading(true);
    try {
      const parentDept = parentId ? departments.find((d) => d.id === parentId) : null;
      await createDepartment({
        name,
        description: description || undefined,
        parentId: parentId || undefined,
        level: parentDept ? parentDept.level + 1 : 0,
      }, orgId);
      onDone();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create department');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-b border-bc-border px-6 py-4 bg-bc-bg-subtle">
      <form onSubmit={handleSubmit} className="space-y-3">
        <h3 className="text-sm font-semibold text-bc-text-dark">
          {defaultParentId ? 'Add Sub-Department' : 'Create New Department'}
        </h3>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs font-medium text-bc-text-muted mb-1 block">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-bc-border bg-white px-3 py-2 text-sm outline-none focus:border-bc-primary"
              placeholder="e.g. Board of Directors, IT Division, Backend Team"
              required
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-bc-text-muted mb-1 block">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-bc-border bg-white px-3 py-2 text-sm outline-none focus:border-bc-primary"
              placeholder="Optional"
            />
          </div>
          <div className="w-48">
            <label className="text-xs font-medium text-bc-text-muted mb-1 block">Parent</label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full rounded-lg border border-bc-border bg-white px-3 py-2 text-sm outline-none focus:border-bc-primary"
            >
              <option value="">-- Root (Top Level) --</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-bc-primary px-4 py-2 text-xs font-semibold text-white hover:bg-bc-primary-dark disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Create'}
          </button>
          <button type="button" onClick={onDone} className="rounded-lg border border-bc-border px-3 py-2 text-xs text-bc-text-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function InlineEdit({
  dept,
  departments,
  onSave,
  onCancel,
}: {
  dept: Department;
  departments: Department[];
  onSave: (name: string, parentId: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(dept.name);
  const [parentId, setParentId] = useState(dept.parentId || '');

  return (
    <div className="flex items-center gap-2 flex-1">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="flex-1 rounded border border-bc-primary bg-white px-2 py-1 text-sm outline-none"
        autoFocus
      />
      <select
        value={parentId}
        onChange={(e) => setParentId(e.target.value)}
        className="rounded border border-bc-border bg-white px-2 py-1 text-xs outline-none"
      >
        <option value="">-- Root --</option>
        {departments.filter((d) => d.id !== dept.id).map((d) => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </select>
      <button onClick={() => onSave(name, parentId)} className="rounded p-1 text-green-600 hover:bg-green-50">
        <Check size={14} />
      </button>
      <button onClick={onCancel} className="rounded p-1 text-red-500 hover:bg-red-50">
        <X size={14} />
      </button>
    </div>
  );
}
