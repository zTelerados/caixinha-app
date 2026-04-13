'use client';

import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Download,
  Smartphone,
  Info,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { Category } from '@/types';

interface FormState {
  name: string;
  emoji: string;
}

export default function ConfigPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormState>({ name: '', emoji: '📌' });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/categories');
      if (!res.ok) throw new Error('Erro ao carregar categorias');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Erro ao carregar categorias');
    } finally {
      setLoading(false);
    }
  };

  const handleNewCategory = async () => {
    if (!formData.name.trim()) return;

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Erro ao criar categoria');
      const newCat = await res.json();
      setCategories([...categories, newCat]);
      setFormData({ name: '', emoji: '📌' });
      setShowNewForm(false);
    } catch (err) {
      console.error('Error creating category:', err);
      setError('Erro ao criar categoria');
    }
  };

  const handleEditCategory = async (id: string) => {
    if (!formData.name.trim()) return;

    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Erro ao atualizar categoria');
      const updated = await res.json();
      setCategories(
        categories.map((cat) => (cat.id === id ? updated : cat))
      );
      setEditingId(null);
      setFormData({ name: '', emoji: '📌' });
    } catch (err) {
      console.error('Error updating category:', err);
      setError('Erro ao atualizar categoria');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Erro ao deletar categoria');
      setCategories(categories.filter((cat) => cat.id !== id));
      setDeletingId(null);
    } catch (err) {
      console.error('Error deleting category:', err);
      setError('Erro ao deletar categoria');
    }
  };

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const res = await fetch('/api/config/export');
      if (!res.ok) throw new Error('Erro ao exportar dados');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'caixinha-export.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error exporting CSV:', err);
      setError('Erro ao exportar dados');
    } finally {
      setExporting(false);
    }
  };

  const startEditingCategory = (cat: Category) => {
    setEditingId(cat.id);
    setFormData({ name: cat.name, emoji: cat.emoji });
    setShowNewForm(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowNewForm(false);
    setFormData({ name: '', emoji: '📌' });
  };

  return (
    <main className="min-h-screen bg-caixa-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/"
            className="btn-icon-primary"
            aria-label="Voltar ao dashboard"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-4xl font-bold text-caixa-text">Configurações</h1>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-caixa-red/10 border border-caixa-red/30 rounded-lg text-caixa-red text-sm">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 underline hover:no-underline"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Categorias Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-caixa-text mb-6">
            Categorias
          </h2>

          <div className="card mb-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-caixa-border border-t-caixa-green"></div>
                <p className="mt-2 text-caixa-muted text-sm">
                  Carregando categorias...
                </p>
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-caixa-muted mb-4">Nenhuma categoria criada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-4 rounded-lg hover:bg-caixa-border/20 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <span className="text-2xl">{cat.emoji}</span>
                      <div className="flex-1">
                        <p className="text-caixa-text font-medium">{cat.name}</p>
                        <p className="text-xs text-caixa-muted">
                          {cat.keywords.length} palavras-chave •{' '}
                          {cat.learned_items.length} aprendizados
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEditingCategory(cat)}
                        className="btn-icon-primary"
                        aria-label="Editar categoria"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => setDeletingId(cat.id)}
                        className="btn-icon hover:bg-caixa-red/10 text-caixa-text hover:text-caixa-red"
                        aria-label="Deletar categoria"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Delete Confirmation */}
                    {deletingId === cat.id && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                        <div className="bg-caixa-card border border-caixa-border rounded-lg p-4 text-center">
                          <p className="text-caixa-text mb-4 font-medium">
                            Deletar "{cat.name}"?
                          </p>
                          <div className="flex gap-3 justify-center">
                            <button
                              onClick={() => setDeletingId(null)}
                              className="px-4 py-2 rounded-lg border border-caixa-border text-caixa-text hover:bg-caixa-border/30 transition-colors text-sm"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(cat.id)}
                              className="px-4 py-2 rounded-lg bg-caixa-red text-caixa-bg hover:bg-caixa-red/80 transition-colors text-sm font-medium"
                            >
                              Deletar
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* New Category Form */}
          {showNewForm && (
            <div className="card bg-caixa-border/10 mb-4">
              <p className="text-caixa-text font-medium mb-4">Nova Categoria</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-caixa-muted block mb-2">
                    Nome
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Alimentação"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-caixa-bg border border-caixa-border rounded-lg text-caixa-text placeholder-caixa-muted focus:outline-none focus:border-caixa-green transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-caixa-muted block mb-2">
                    Emoji
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 🍔"
                    value={formData.emoji}
                    onChange={(e) =>
                      setFormData({ ...formData, emoji: e.target.value })
                    }
                    maxLength={2}
                    className="w-full px-3 py-2 bg-caixa-bg border border-caixa-border rounded-lg text-caixa-text placeholder-caixa-muted focus:outline-none focus:border-caixa-green transition-colors text-center text-lg"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleNewCategory}
                    className="flex-1 px-4 py-2 rounded-lg bg-caixa-green text-caixa-bg hover:bg-caixa-green/80 transition-colors font-medium text-sm"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="flex-1 px-4 py-2 rounded-lg border border-caixa-border text-caixa-text hover:bg-caixa-border/30 transition-colors font-medium text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Edit Category Form */}
          {editingId && (
            <div className="card bg-caixa-border/10 mb-4">
              <p className="text-caixa-text font-medium mb-4">Editar Categoria</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-caixa-muted block mb-2">
                    Nome
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-caixa-bg border border-caixa-border rounded-lg text-caixa-text placeholder-caixa-muted focus:outline-none focus:border-caixa-green transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-caixa-muted block mb-2">
                    Emoji
                  </label>
                  <input
                    type="text"
                    value={formData.emoji}
                    onChange={(e) =>
                      setFormData({ ...formData, emoji: e.target.value })
                    }
                    maxLength={2}
                    className="w-full px-3 py-2 bg-caixa-bg border border-caixa-border rounded-lg text-caixa-text placeholder-caixa-muted focus:outline-none focus:border-caixa-green transition-colors text-center text-lg"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditCategory(editingId)}
                    className="flex-1 px-4 py-2 rounded-lg bg-caixa-green text-caixa-bg hover:bg-caixa-green/80 transition-colors font-medium text-sm"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="flex-1 px-4 py-2 rounded-lg border border-caixa-border text-caixa-text hover:bg-caixa-border/30 transition-colors font-medium text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {!showNewForm && !editingId && (
            <button
              onClick={() => setShowNewForm(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-caixa-green text-caixa-green hover:bg-caixa-green/10 transition-colors font-medium"
            >
              <Plus size={18} />
              Nova Categoria
            </button>
          )}
        </section>

        {/* Exportar Dados Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-caixa-text mb-6">
            Exportar Dados
          </h2>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-caixa-text font-medium mb-1">
                  Exportar como CSV
                </p>
                <p className="text-sm text-caixa-muted">
                  Baixe todos os seus dados em formato CSV
                </p>
              </div>
              <button
                onClick={handleExportCSV}
                disabled={exporting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-caixa-green text-caixa-bg hover:bg-caixa-green/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
              >
                <Download size={16} />
                {exporting ? 'Exportando...' : 'Exportar CSV'}
              </button>
            </div>
          </div>
        </section>

        {/* Como Instalar no iPhone Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-caixa-text mb-6">
            Como Instalar no iPhone
          </h2>

          <div className="card">
            <div className="flex items-start gap-4 mb-6">
              <Smartphone className="text-caixa-green flex-shrink-0 mt-1" size={20} />
              <div className="flex-1">
                <p className="text-caixa-text font-medium mb-4">
                  Transforme Caixinha em um app nativo
                </p>
                <ol className="space-y-3">
                  <li className="flex gap-3">
                    <span className="text-caixa-green font-semibold flex-shrink-0 w-6">
                      1.
                    </span>
                    <span className="text-caixa-text text-sm">
                      Abra esta página no Safari
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-caixa-green font-semibold flex-shrink-0 w-6">
                      2.
                    </span>
                    <span className="text-caixa-text text-sm">
                      Toque no ícone de compartilhar (⎙)
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-caixa-green font-semibold flex-shrink-0 w-6">
                      3.
                    </span>
                    <span className="text-caixa-text text-sm">
                      Toque em "Adicionar à Tela de Início"
                    </span>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* Informações Section */}
        <section>
          <h2 className="text-2xl font-semibold text-caixa-text mb-6">
            Informações
          </h2>

          <div className="card">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Info size={16} className="text-caixa-green" />
                  <span className="text-caixa-text font-medium">Versão</span>
                </div>
                <span className="text-caixa-muted text-sm">v8.0</span>
              </div>

              <div className="border-t border-caixa-border" />

              <div>
                <p className="text-caixa-text font-medium mb-2 flex items-center gap-2">
                  <ExternalLink size={16} className="text-caixa-green" />
                  Repositório GitHub
                </p>
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-caixa-green hover:text-caixa-green/80 text-sm transition-colors"
                >
                  github.com/caixinha
                </a>
              </div>

              <div className="border-t border-caixa-border" />

              <p className="text-caixa-muted text-sm">
                Caixinha — Dashboard Financeiro Pessoal
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
