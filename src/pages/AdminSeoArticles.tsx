import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ExternalLink, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArticleContent } from "@/components/resources/ArticleContent";
import {
  articlePath,
  articlesTable,
  CONTENT_TYPES,
  estimateReadingTime,
  slugify,
  type ArticleCtaType,
  type FaqItem,
  type SeoArticle,
} from "@/lib/seo-articles";

type Draft = Omit<SeoArticle, "id" | "created_at" | "updated_at" | "updated_by"> & { id?: string };

const EMPTY: Draft = {
  title: "", seo_title: "", slug: "", language: "fr", content_type: "guide", excerpt: "", content: "",
  category: "", country: "", featured_image: "", og_image: "", author: "WineExporters", status: "draft",
  published_at: null, meta_title: "", meta_description: "", focus_keyword: "", canonical_url: "",
  is_featured: false, reading_time: null, cta_type: "market_analysis", related_article_ids: [], faq: [],
};

const PAGE_SIZE = 10;
const toLocalInput = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");
const nullIfEmpty = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);

const AdminSeoArticles = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<SeoArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await articlesTable().select("*").order("updated_at", { ascending: false });
    if (error) toast({ title: t("seoArticles.admin.error"), description: error.message, variant: "destructive" });
    setRows((data ?? []) as SeoArticle[]);
    setLoading(false);
  }, [t, toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? rows.filter((r) => [r.title, r.slug, r.category, r.country].some((v) => v?.toLowerCase().includes(q))) : rows;
  }, [rows, search]);
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const statusBadge = (r: SeoArticle) => {
    if (r.status === "draft") return <Badge variant="secondary">{t("seoArticles.admin.draft")}</Badge>;
    if (r.published_at && new Date(r.published_at) > new Date())
      return <Badge variant="outline">{t("seoArticles.admin.scheduled")}</Badge>;
    return <Badge>{t("seoArticles.admin.published")}</Badge>;
  };

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));

  const openNew = () => { setDraft({ ...EMPTY }); setSlugTouched(false); };
  const openEdit = (r: SeoArticle) => {
    setDraft({ ...r, faq: Array.isArray(r.faq) ? r.faq : [], related_article_ids: r.related_article_ids ?? [] });
    setSlugTouched(true);
  };

  const save = async () => {
    if (!draft) return;
    const slug = slugify(draft.slug || draft.title);
    if (!draft.title.trim() || !slug) {
      toast({ title: t("seoArticles.admin.error"), description: t("seoArticles.admin.f.title"), variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      title: draft.title.trim(),
      seo_title: nullIfEmpty(draft.seo_title),
      slug,
      language: draft.language || "fr",
      content_type: draft.content_type || "guide",
      excerpt: nullIfEmpty(draft.excerpt),
      content: draft.content,
      category: nullIfEmpty(draft.category),
      country: nullIfEmpty(draft.country),
      featured_image: nullIfEmpty(draft.featured_image),
      og_image: nullIfEmpty(draft.og_image),
      author: nullIfEmpty(draft.author),
      status: draft.status,
      published_at: draft.published_at ?? (draft.status === "published" ? new Date().toISOString() : null),
      meta_title: nullIfEmpty(draft.meta_title),
      meta_description: nullIfEmpty(draft.meta_description),
      focus_keyword: nullIfEmpty(draft.focus_keyword),
      canonical_url: nullIfEmpty(draft.canonical_url),
      is_featured: draft.is_featured,
      reading_time: draft.reading_time || estimateReadingTime(draft.content),
      cta_type: draft.cta_type,
      related_article_ids: draft.related_article_ids,
      faq: draft.faq.filter((f) => f.question.trim() && f.answer.trim()),
      updated_by: user?.id ?? null,
    };
    const { error } = draft.id
      ? await articlesTable().update(payload).eq("id", draft.id)
      : await articlesTable().insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: t("seoArticles.admin.error"), description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: t("seoArticles.admin.saved") });
    setDraft(null);
    load();
  };

  const togglePublish = async (r: SeoArticle) => {
    const publish = r.status !== "published";
    const { error } = await articlesTable()
      .update({
        status: publish ? "published" : "draft",
        published_at: publish ? r.published_at ?? new Date().toISOString() : r.published_at,
        updated_by: user?.id ?? null,
      })
      .eq("id", r.id);
    if (error) toast({ title: t("seoArticles.admin.error"), description: error.message, variant: "destructive" });
    load();
  };

  const remove = async (r: SeoArticle) => {
    if (!window.confirm(t("seoArticles.admin.confirmDelete"))) return;
    const { error } = await articlesTable().delete().eq("id", r.id);
    if (error) toast({ title: t("seoArticles.admin.error"), description: error.message, variant: "destructive" });
    else toast({ title: t("seoArticles.admin.deleted") });
    load();
  };

  const field = (key: keyof Draft, label: string, props: { type?: string; placeholder?: string } = {}) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type={props.type}
        placeholder={props.placeholder}
        value={(draft?.[key] as string | null) ?? ""}
        onChange={(e) => set(key, e.target.value as never)}
      />
    </div>
  );

  return (
    <div className="p-4 sm:p-8 lg:p-10 space-y-6 max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("seoArticles.admin.title")}</h1>
          <p className="text-muted-foreground">{t("seoArticles.admin.subtitle")}</p>
        </div>
        <Button onClick={openNew}><Plus className="mr-1 h-4 w-4" />{t("seoArticles.admin.new")}</Button>
      </div>

      <Input
        placeholder={t("seoArticles.admin.search")}
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(0); }}
        className="max-w-sm"
      />

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : !filtered.length ? (
            <p className="p-8 text-center text-sm text-muted-foreground">{t("seoArticles.admin.empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("seoArticles.admin.colTitle")}</TableHead>
                    <TableHead>{t("seoArticles.admin.colStatus")}</TableHead>
                    <TableHead>{t("seoArticles.admin.colCategory")}</TableHead>
                    <TableHead>{t("seoArticles.admin.colCountry")}</TableHead>
                    <TableHead>{t("seoArticles.admin.colDate")}</TableHead>
                    <TableHead className="text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-medium">{r.title}</div>
                        <div className="text-xs text-muted-foreground">/{r.slug} · {r.language.toUpperCase()}</div>
                      </TableCell>
                      <TableCell>{statusBadge(r)}</TableCell>
                      <TableCell>{r.category ?? "—"}</TableCell>
                      <TableCell>{r.country ?? "—"}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {r.published_at ? new Date(r.published_at).toLocaleDateString(i18n.language) : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="outline" onClick={() => togglePublish(r)}>
                            {r.status === "published" ? t("seoArticles.admin.unpublish") : t("seoArticles.admin.publish")}
                          </Button>
                          {r.status === "published" && (
                            <Button size="icon" variant="ghost" asChild aria-label={t("seoArticles.admin.view")}>
                              <Link to={articlePath(r.slug)} target="_blank"><ExternalLink className="h-4 w-4" /></Link>
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" onClick={() => openEdit(r)} aria-label={t("seoArticles.admin.edit")}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => remove(r)} aria-label={t("seoArticles.admin.delete")}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {pageCount > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>‹</Button>
          <span>{page + 1} / {pageCount}</span>
          <Button size="sm" variant="outline" disabled={page + 1 >= pageCount} onClick={() => setPage(page + 1)}>›</Button>
        </div>
      )}

      <Sheet open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
          <SheetHeader>
            <SheetTitle>{draft?.id ? t("seoArticles.admin.editorTitleEdit") : t("seoArticles.admin.editorTitleNew")}</SheetTitle>
          </SheetHeader>
          {draft && (
            <div className="mt-4 space-y-4">
              <Tabs defaultValue="content">
                <TabsList>
                  <TabsTrigger value="content">{t("seoArticles.admin.tabContent")}</TabsTrigger>
                  <TabsTrigger value="seo">{t("seoArticles.admin.tabSeo")}</TabsTrigger>
                  <TabsTrigger value="links">{t("seoArticles.admin.tabLinks")}</TabsTrigger>
                  <TabsTrigger value="preview">{t("seoArticles.admin.preview")}</TabsTrigger>
                </TabsList>

                <TabsContent value="content" className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>{t("seoArticles.admin.f.title")}</Label>
                    <Input
                      value={draft.title}
                      onChange={(e) => {
                        const title = e.target.value;
                        setDraft((d) => (d ? { ...d, title, slug: slugTouched ? d.slug : slugify(title) } : d));
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("seoArticles.admin.f.slug")}</Label>
                    <Input
                      value={draft.slug}
                      onChange={(e) => { setSlugTouched(true); set("slug", e.target.value); }}
                      onBlur={() => set("slug", slugify(draft.slug))}
                    />
                    <p className="text-xs text-muted-foreground">/ressources/{slugify(draft.slug || draft.title)}</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>{t("seoArticles.admin.f.language")}</Label>
                      <Select value={draft.language} onValueChange={(v) => set("language", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="fr">FR</SelectItem><SelectItem value="en">EN</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("seoArticles.admin.f.contentType")}</Label>
                      <Select value={draft.content_type} onValueChange={(v) => set("content_type", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CONTENT_TYPES.map((c) => <SelectItem key={c} value={c}>{t(`seoArticles.admin.types.${c}`)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {field("category", t("seoArticles.admin.f.category"))}
                    {field("country", t("seoArticles.admin.f.country"))}
                    <div className="space-y-1.5">
                      <Label>{t("seoArticles.admin.f.status")}</Label>
                      <Select value={draft.status} onValueChange={(v) => set("status", v as Draft["status"])}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">{t("seoArticles.admin.draft")}</SelectItem>
                          <SelectItem value="published">{t("seoArticles.admin.published")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("seoArticles.admin.f.publishedAt")}</Label>
                      <Input
                        type="datetime-local"
                        value={toLocalInput(draft.published_at)}
                        onChange={(e) => set("published_at", e.target.value ? new Date(e.target.value).toISOString() : null)}
                      />
                    </div>
                    {field("author", t("seoArticles.admin.f.author"))}
                    {field("featured_image", t("seoArticles.admin.f.featuredImage"), { placeholder: "https://" })}
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("seoArticles.admin.f.excerpt")}</Label>
                    <Textarea rows={3} value={draft.excerpt ?? ""} onChange={(e) => set("excerpt", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("seoArticles.admin.f.content")}</Label>
                    <p className="text-xs text-muted-foreground">{t("seoArticles.admin.f.contentHelp")}</p>
                    <Textarea rows={18} className="font-mono text-sm" value={draft.content} onChange={(e) => set("content", e.target.value)} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={draft.is_featured} onCheckedChange={(v) => set("is_featured", v)} />
                    <Label>{t("seoArticles.admin.f.featured")}</Label>
                  </div>
                </TabsContent>

                <TabsContent value="seo" className="space-y-4">
                  {field("seo_title", t("seoArticles.admin.f.seoTitle"))}
                  {field("meta_title", t("seoArticles.admin.f.metaTitle"))}
                  <div className="space-y-1.5">
                    <Label>{t("seoArticles.admin.f.metaDescription")}</Label>
                    <Textarea rows={3} value={draft.meta_description ?? ""} onChange={(e) => set("meta_description", e.target.value)} />
                    <p className="text-xs text-muted-foreground">{(draft.meta_description ?? "").length} / 160</p>
                  </div>
                  {field("focus_keyword", t("seoArticles.admin.f.focusKeyword"))}
                  {field("canonical_url", t("seoArticles.admin.f.canonical"), { placeholder: "https://wine-exporters.com/ressources/..." })}
                  {field("og_image", t("seoArticles.admin.f.ogImage"), { placeholder: "https://" })}
                  <div className="space-y-1.5">
                    <Label>{t("seoArticles.admin.f.readingTime")}</Label>
                    <Input
                      type="number"
                      min={1}
                      value={draft.reading_time ?? ""}
                      placeholder={String(estimateReadingTime(draft.content))}
                      onChange={(e) => set("reading_time", e.target.value ? Number(e.target.value) : null)}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="links" className="space-y-6">
                  <div className="space-y-1.5">
                    <Label>{t("seoArticles.admin.f.ctaType")}</Label>
                    <Select value={draft.cta_type ?? "market_analysis"} onValueChange={(v) => set("cta_type", v as ArticleCtaType)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(["market_analysis", "demo", "both", "none"] as const).map((c) => (
                          <SelectItem key={c} value={c}>{t(`seoArticles.admin.ctaOptions.${c}`)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("seoArticles.admin.f.related")}</Label>
                    <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border p-3">
                      {rows.filter((r) => r.id !== draft.id).map((r) => (
                        <label key={r.id} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={draft.related_article_ids.includes(r.id)}
                            onCheckedChange={(c) =>
                              set("related_article_ids", c
                                ? [...draft.related_article_ids, r.id]
                                : draft.related_article_ids.filter((id) => id !== r.id))
                            }
                          />
                          {r.title}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label>{t("seoArticles.admin.f.faq")}</Label>
                    {draft.faq.map((f, i) => {
                      const update = (patch: Partial<FaqItem>) =>
                        set("faq", draft.faq.map((x, j) => (j === i ? { ...x, ...patch } : x)));
                      return (
                        <div key={i} className="space-y-2 rounded-md border p-3">
                          <Input placeholder={t("seoArticles.admin.f.faqQ")} value={f.question} onChange={(e) => update({ question: e.target.value })} />
                          <Textarea rows={2} placeholder={t("seoArticles.admin.f.faqA")} value={f.answer} onChange={(e) => update({ answer: e.target.value })} />
                          <Button size="sm" variant="ghost" onClick={() => set("faq", draft.faq.filter((_, j) => j !== i))}>
                            <Trash2 className="mr-1 h-4 w-4" />{t("seoArticles.admin.delete")}
                          </Button>
                        </div>
                      );
                    })}
                    <Button size="sm" variant="outline" onClick={() => set("faq", [...draft.faq, { question: "", answer: "" }])}>
                      <Plus className="mr-1 h-4 w-4" />{t("seoArticles.admin.f.addFaq")}
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="preview">
                  <h1 className="font-display text-3xl font-bold">{draft.title}</h1>
                  {draft.excerpt && <p className="mt-4 text-lg">{draft.excerpt}</p>}
                  <ArticleContent content={draft.content} />
                </TabsContent>
              </Tabs>

              <div className="sticky bottom-0 flex justify-end gap-2 border-t bg-background py-3">
                <Button variant="outline" onClick={() => setDraft(null)}>{t("seoArticles.admin.cancel")}</Button>
                <Button onClick={save} disabled={saving}>
                  {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}{t("seoArticles.admin.save")}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AdminSeoArticles;
