// Projects dashboard page: list of projects, rename/delete modals, and new project card
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FolderKanban,
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
  FolderOpen,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppShell from '../components/layout/AppShell';
import Button from '../components/Button';
import Modal from '../components/Modal';
import projectService from '../services/projectService';

export default function Projects() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useSelector((state) => state.auth);

  // Active dropdown menu by project id
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Rename modal states
  const [renameProject, setRenameProject] = useState(null);
  const [newName, setNewName] = useState('');

  // Delete modal state
  const [deleteProject, setDeleteProject] = useState(null);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", "project"],
    queryFn: () => projectService.getProjects(user?.token, "project"),
    enabled: !!user?.token,
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }) => projectService.renameProject(user?.token, id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", "project"] });
      setRenameProject(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => projectService.deleteProject(user?.token, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", "project"] });
      setDeleteProject(null);
    },
  });

  const handleSaveRename = (e) => {
    e.preventDefault();
    if (!newName.trim() || !renameProject) return;
    renameMutation.mutate({ id: renameProject._id, name: newName.trim() });
  };

  const handleConfirmDelete = () => {
    if (!deleteProject) return;
    deleteMutation.mutate(deleteProject._id);
  };

  return (
    <AppShell
      title="Projects"
      description="Everything you have built with Drexel-Ai"
      actionButton={
        <Link to="/projects/new">
          <Button variant="primary" icon={Plus}>
            New project
          </Button>
        </Link>
      }
    >
      {projects.length === 0 ? (
        // Empty State
        <div className="bg-card border border-line rounded-2xl p-12 text-center flex flex-col items-center gap-4 my-8">
          <div className="w-12 h-12 rounded-xl bg-surface border border-line flex items-center justify-center text-muted">
            <FolderOpen size={24} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-ink">No projects yet</h3>
            <p className="text-sm text-muted mt-1">Start by creating your first AI-generated application.</p>
          </div>
          <Link to="/projects/new">
            <Button variant="primary" icon={Plus}>
              New project
            </Button>
          </Link>
        </div>
      ) : (
        // Projects Grid: 4 cols desktop, 2 cols tablet, 1 col mobile
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Dashed New Project card */}
          <Link
            to="/projects/new"
            className="border-2 border-dashed border-line hover:border-[#0099FF] rounded-2xl flex flex-col items-center justify-center min-h-[190px] p-6 text-center bg-card/40 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-surface border border-line flex items-center justify-center text-[#0099FF] mb-3">
              <Plus size={20} />
            </div>
            <span className="text-sm font-semibold text-ink">New project</span>
            <span className="text-xs text-muted mt-1">Create from a prompt</span>
          </Link>

          {/* Project Cards */}
          {projects.map((project) => (
            <div
              key={project._id}
              onClick={() => navigate(`/projects/${project._id}`)}
              className="bg-card border border-line hover:border-[#0099FF] rounded-2xl p-5 flex flex-col justify-between cursor-pointer relative shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 flex items-center justify-center text-[#0099FF] shrink-0">
                  <FolderKanban size={20} />
                </div>

                {/* Three-dot menu */}
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    aria-label="Project actions"
                    onClick={() => setActiveMenuId(activeMenuId === project._id ? null : project._id)}
                    className="p-1 rounded-lg text-muted hover:text-ink hover:bg-surface cursor-pointer"
                  >
                    <MoreVertical size={18} />
                  </button>

                  {activeMenuId === project._id && (
                    <div className="absolute right-0 top-8 w-36 bg-card border border-line rounded-xl shadow-lg py-1 z-20">
                      <button
                        type="button"
                        onClick={() => {
                          setRenameProject(project);
                          setNewName(project.name);
                          setActiveMenuId(null);
                        }}
                        className="w-full px-3 py-2 text-left text-xs font-medium text-ink hover:bg-surface flex items-center gap-2 cursor-pointer"
                      >
                        <Edit2 size={14} /> Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteProject(project);
                          setActiveMenuId(null);
                        }}
                        className="w-full px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-surface flex items-center gap-2 cursor-pointer"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <h3 className="text-sm font-semibold text-ink truncate mb-1" title={project.name}>
                  {project.name}
                </h3>
                <div className="text-xs text-muted space-y-0.5">
                  <div>{"Updated " + new Date(project.updatedAt).toLocaleDateString("en-IN")}</div>
                  <div className="text-[11px] text-muted/80">{"Created " + new Date(project.createdAt).toLocaleDateString("en-IN")}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rename Modal */}
      <Modal isOpen={!!renameProject} onClose={() => setRenameProject(null)} title="Rename project">
        <form onSubmit={handleSaveRename} className="flex flex-col gap-4 mt-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full h-11 px-3.5 rounded-xl border border-line bg-surface text-ink text-sm outline-none focus:ring-2 focus:ring-[#0099FF]"
            autoFocus
          />
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setRenameProject(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteProject}
        onClose={() => setDeleteProject(null)}
        title="Delete this project?"
        description="This permanently deletes the project and its chat history."
      >
        <div className="flex items-center justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={() => setDeleteProject(null)} className="min-w-[100px]">
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirmDelete} className="min-w-[100px]">
            Delete
          </Button>
        </div>
      </Modal>
    </AppShell>
  );
}
