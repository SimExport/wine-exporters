import { ResourceArticle, type ResourceArticleConfig } from "@/components/resources/ResourceArticle";

const CONFIG: ResourceArticleConfig = {
  i18nKey: "firstEmailAttachments",
  path: "/ressources/documents-premier-email",
  type: "guide",
  nextHref: "/ressources/structurer-relances",
};

const FirstEmailAttachments = () => <ResourceArticle config={CONFIG} />;

export default FirstEmailAttachments;
