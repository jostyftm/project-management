"use client";

import React, { useState } from "react";
import { ReportBlock } from "@/types/workspace-report-types";
import {
  BookOpen,
  FileText,
  Download,
  Image as ImageIcon,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Layers,
  Sparkles,
  Paperclip,
  X,
  Maximize2,
} from "lucide-react";

interface DeliverableItem {
  id: string;
  title: string;
  file_name: string;
  file_size?: number | null;
  file_mime?: string | null;
  url: string;
  data_url?: string | null;
  status?: string;
  created_at?: string;
}

interface SubStoryItem {
  id: string;
  identifier: string;
  title: string;
  priority: string;
  estimate_points: number;
  state?: {
    id: string;
    name: string;
    group: string;
    color: string;
  } | null;
  type?: {
    id: string;
    name: string;
    color: string;
  } | null;
  assignees?: Array<{ id: string; name: string; avatar?: string | null }>;
  evidences: {
    images: DeliverableItem[];
    pdfs: DeliverableItem[];
    others: DeliverableItem[];
    all: DeliverableItem[];
    count: number;
  };
}

interface UserStoryItem {
  id: string;
  identifier: string;
  title: string;
  description_html?: string | null;
  priority: string;
  estimate_points: number;
  project?: {
    id: string;
    name: string;
    identifier: string;
  } | null;
  state?: {
    id: string;
    name: string;
    group: string;
    color: string;
  } | null;
  type?: {
    id: string;
    name: string;
    color: string;
  } | null;
  lead?: {
    id: string;
    name: string;
    avatar?: string | null;
  } | null;
  assignees?: Array<{ id: string; name: string; avatar?: string | null }>;
  target_date?: string | null;
  evidences: {
    images: DeliverableItem[];
    pdfs: DeliverableItem[];
    others: DeliverableItem[];
    all: DeliverableItem[];
    count: number;
  };
  sub_stories: SubStoryItem[];
  has_sub_stories: boolean;
}

interface UserStoriesEvidencesBlockProps {
  block: ReportBlock;
  data?: {
    stories?: UserStoryItem[];
    total_stories?: number;
    summary?: {
      total_deliverables: number;
      total_images: number;
      total_pdfs: number;
    };
  };
  isEditing?: boolean;
}

function formatBytes(bytes?: number | null) {
  if (!bytes || bytes <= 0) return "";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function UserStoriesEvidencesBlock({
  block,
  data,
}: UserStoriesEvidencesBlockProps) {
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);
  const [collapsedStories, setCollapsedStories] = useState<Record<string, boolean>>({});

  const stories: UserStoryItem[] = data?.stories || [
    {
      id: "1",
      identifier: "ENG-101",
      title: "Autenticación biométrica y doble factor en app móvil",
      priority: "HIGH",
      estimate_points: 8,
      state: { id: "3", name: "Completada", group: "COMPLETED", color: "#10b981" },
      type: { id: "1", name: "Historia de Usuario", color: "#6366f1" },
      lead: { id: "1", name: "Alejandro Gómez" },
      evidences: {
        images: [
          {
            id: "101",
            title: "Captura flujo FaceID exitoso",
            file_name: "faceid-success.png",
            file_size: 245000,
            url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=60",
          },
        ],
        pdfs: [
          {
            id: "102",
            title: "Acta de pruebas y seguridad biométrica",
            file_name: "reporte-seguridad-2fa.pdf",
            file_size: 1420000,
            url: "#",
          },
        ],
        others: [],
        all: [],
        count: 2,
      },
      has_sub_stories: true,
      sub_stories: [
        {
          id: "2",
          identifier: "ENG-102",
          title: "Subtarea: Integración de SDK LocalAuthentication",
          priority: "HIGH",
          estimate_points: 5,
          state: { id: "3", name: "Completada", group: "COMPLETED", color: "#10b981" },
          evidences: {
            images: [],
            pdfs: [
              {
                id: "103",
                title: "Log de validación de tokens",
                file_name: "token-validation.pdf",
                file_size: 320000,
                url: "#",
              },
            ],
            others: [],
            all: [],
            count: 1,
          },
        },
      ],
    },
  ];

  const summary = data?.summary || {
    total_deliverables: 3,
    total_images: 1,
    total_pdfs: 2,
  };

  const toggleCollapse = (storyId: string) => {
    setCollapsedStories((prev) => ({ ...prev, [storyId]: !prev[storyId] }));
  };

  return (
    <div className="w-full bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-xl p-5 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-neutral-100 dark:border-neutral-800/80">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {block.title || "Historias de Usuario y Evidencias"}
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Estructura anidada con entregables, previsualización de imágenes y descargas PDF
            </p>
          </div>
        </div>

        {/* Quick Badges */}
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium">
            <BookOpen className="w-3 h-3 text-indigo-500" />
            {data?.total_stories ?? stories.length} historias
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-medium border border-rose-100 dark:border-rose-900">
            <FileText className="w-3 h-3" />
            {summary.total_pdfs} PDFs
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-medium border border-blue-100 dark:border-blue-900">
            <ImageIcon className="w-3 h-3" />
            {summary.total_images} imágenes
          </span>
        </div>
      </div>

      {/* Stories List */}
      <div className="space-y-4">
        {stories.length === 0 ? (
          <div className="py-12 text-center text-xs text-neutral-400">
            No se encontraron historias de usuario para los filtros seleccionados.
          </div>
        ) : (
          stories.map((story) => {
            const isCollapsed = collapsedStories[story.id];

            return (
              <div
                key={story.id}
                className="border border-neutral-200/90 dark:border-neutral-800 rounded-xl overflow-hidden bg-white dark:bg-neutral-900 transition-all shadow-2xs hover:border-neutral-300 dark:hover:border-neutral-700"
              >
                {/* Story Main Bar */}
                <div className="p-4 bg-neutral-50/50 dark:bg-neutral-800/20 border-b border-neutral-100 dark:border-neutral-800/60">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-start gap-2.5">
                      {story.has_sub_stories && (
                        <button
                          type="button"
                          onClick={() => toggleCollapse(story.id)}
                          className="mt-0.5 p-1 rounded-md text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
                          title={isCollapsed ? "Expandir subtareas" : "Colapsar subtareas"}
                        >
                          {isCollapsed ? (
                            <ChevronRight className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-200/60 dark:border-indigo-800">
                            {story.identifier}
                          </span>
                          {story.project && (
                            <span className="text-[10px] text-neutral-400">
                              • {story.project.name}
                            </span>
                          )}
                        </div>
                        <h5 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                          {story.title}
                        </h5>
                      </div>
                    </div>

                    {/* Metadata Badges */}
                    <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                      {story.state && (
                        <span
                          className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full border"
                          style={{
                            backgroundColor: `${story.state.color}15`,
                            color: story.state.color,
                            borderColor: `${story.state.color}40`,
                          }}
                        >
                          {story.state.name}
                        </span>
                      )}
                      <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">
                        {story.estimate_points} pts
                      </span>
                      {story.lead && (
                        <span className="text-[11px] text-neutral-500 font-medium">
                          Lead: {story.lead.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* HTML Description if available */}
                  {story.description_html && (
                    <div
                      className="mt-2.5 text-xs text-neutral-600 dark:text-neutral-300 prose prose-xs dark:prose-invert max-w-none line-clamp-3"
                      dangerouslySetInnerHTML={{ __html: story.description_html }}
                    />
                  )}
                </div>

                {/* Evidence Section (Images & PDFs) */}
                <div className="p-4 bg-white dark:bg-neutral-900">
                  {/* Images Gallery */}
                  {story.evidences.images.length > 0 && (
                    <div className="mb-4">
                      <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                        <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                        Evidencias Fotográficas ({story.evidences.images.length})
                      </span>
                      <div className="flex flex-col gap-4 w-full">
                        {story.evidences.images.map((img) => (
                          <div
                            key={img.id}
                            onClick={() => setLightboxImage({ url: img.data_url || img.url, title: img.title || img.file_name })}
                            className="group relative cursor-pointer overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 shadow-xs hover:border-indigo-500 hover:shadow-md transition-all w-full flex flex-col"
                          >
                            <div className="w-full bg-neutral-950 flex items-center justify-center max-h-[520px] overflow-hidden">
                              <img
                                src={img.data_url || img.url}
                                alt={img.title || img.file_name}
                                className="w-full h-auto max-h-[520px] object-contain transition-transform duration-300 group-hover:scale-[1.01]"
                              />
                            </div>
                            <div className="p-3 bg-white dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <ImageIcon className="w-4 h-4 text-blue-500 shrink-0" />
                                <span className="font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                                  {img.title || img.file_name}
                                </span>
                              </div>
                              <button
                                type="button"
                                className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
                              >
                                <Maximize2 className="w-3.5 h-3.5" />
                                <span>Ver completa</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* PDFs Download Cards */}
                  {story.evidences.pdfs.length > 0 && (
                    <div>
                      <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                        <FileText className="w-3.5 h-3.5 text-rose-500" />
                        Documentos y Evidencias PDF ({story.evidences.pdfs.length})
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {story.evidences.pdfs.map((pdf) => (
                          <a
                            key={pdf.id}
                            href={pdf.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-2.5 rounded-lg border border-rose-100 dark:border-rose-950/60 bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-100/50 dark:hover:bg-rose-950/40 transition-colors group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-7 h-7 rounded-md bg-rose-500 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                                PDF
                              </div>
                              <div className="truncate">
                                <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 block truncate group-hover:text-rose-600 transition-colors">
                                  {pdf.title || pdf.file_name}
                                </span>
                                <span className="text-[10px] text-neutral-400">
                                  {formatBytes(pdf.file_size)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 shrink-0 ml-2">
                              <Download className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Descargar</span>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {story.evidences.images.length === 0 && story.evidences.pdfs.length === 0 && (
                    <div className="text-[11px] text-neutral-400 italic">
                      Sin evidencias formales adjuntas a esta historia.
                    </div>
                  )}
                </div>

                {/* Sub-stories (Nested Format) */}
                {story.has_sub_stories && !isCollapsed && (
                  <div className="bg-neutral-50/60 dark:bg-neutral-950/40 p-4 border-t border-neutral-100 dark:border-neutral-800">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-2.5">
                      Sub-historias y Subtareas Anidadas ({story.sub_stories.length})
                    </span>
                    <div className="space-y-2.5 pl-3 border-l-2 border-indigo-200 dark:border-indigo-900/60">
                      {story.sub_stories.map((sub) => (
                        <div
                          key={sub.id}
                          className="p-3 rounded-lg border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono font-bold text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                                {sub.identifier}
                              </span>
                              <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
                                {sub.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {sub.state && (
                                <span
                                  className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
                                  style={{
                                    backgroundColor: `${sub.state.color}15`,
                                    color: sub.state.color,
                                  }}
                                >
                                  {sub.state.name}
                                </span>
                              )}
                              <span className="text-[10px] font-bold text-neutral-500">
                                {sub.estimate_points} pts
                              </span>
                            </div>
                          </div>

                          {/* Sub-story Evidences */}
                          {(sub.evidences.images.length > 0 || sub.evidences.pdfs.length > 0) && (
                            <div className="flex flex-col gap-3 w-full pt-2 border-t border-neutral-100 dark:border-neutral-800">
                              {sub.evidences.images.length > 0 && (
                                <div className="space-y-2 w-full">
                                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                                    <ImageIcon className="w-3 h-3 text-blue-500" />
                                    <span>Evidencias ({sub.evidences.images.length})</span>
                                  </span>
                                  <div className="flex flex-col gap-2.5 w-full">
                                    {sub.evidences.images.map((sImg) => (
                                      <div
                                        key={sImg.id}
                                        onClick={() => setLightboxImage({ url: sImg.data_url || sImg.url, title: sImg.title || sImg.file_name })}
                                        className="group relative cursor-pointer overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 shadow-xs hover:border-indigo-500 transition-all w-full flex flex-col"
                                      >
                                        <div className="w-full bg-neutral-950 flex items-center justify-center max-h-[380px] overflow-hidden">
                                          <img
                                            src={sImg.data_url || sImg.url}
                                            alt={sImg.title || sImg.file_name}
                                            className="w-full h-auto max-h-[380px] object-contain transition-transform duration-300 group-hover:scale-[1.01]"
                                          />
                                        </div>
                                        <div className="p-2.5 bg-white dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                                          <span className="font-medium text-neutral-700 dark:text-neutral-300 truncate text-[11px]">
                                            {sImg.title || sImg.file_name}
                                          </span>
                                          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1 shrink-0">
                                            <Maximize2 className="w-3 h-3" /> Ver completa
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {sub.evidences.pdfs.length > 0 && (
                                <div className="flex flex-wrap items-center gap-2">
                                  {sub.evidences.pdfs.map((sPdf) => (
                                    <a
                                      key={sPdf.id}
                                      href={sPdf.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[10px] font-medium text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-1 rounded border border-rose-100 dark:border-rose-900"
                                    >
                                      <FileText className="w-3 h-3" />
                                      <span>{sPdf.file_name}</span>
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-white dark:bg-neutral-900 rounded-xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-3 border-b border-neutral-200 dark:border-neutral-800">
              <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                {lightboxImage.title}
              </span>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="p-1 rounded-md text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center">
              <img
                src={lightboxImage.url}
                alt={lightboxImage.title}
                className="max-h-[75vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function UserStoriesEvidencesConfigPanel({
  config,
  onChange,
}: {
  config: Record<string, any>;
  onChange: (cfg: Record<string, any>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
          Límite de historias principales
        </label>
        <input
          type="number"
          min={1}
          max={50}
          value={config.limit || 20}
          onChange={(e) => onChange({ ...config, limit: parseInt(e.target.value) || 20 })}
          className="w-full text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-neutral-800 dark:text-neutral-200"
        />
      </div>
    </div>
  );
}
