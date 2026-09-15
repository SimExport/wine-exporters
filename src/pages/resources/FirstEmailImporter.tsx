import { ResourceArticle, type ResourceArticleConfig } from "@/components/resources/ResourceArticle";

const CONFIG: ResourceArticleConfig = {
  i18nKey: "firstEmail",
  path: "/ressources/premier-email-importateur",
  type: "guide",
  nextHref: "/ressources/documents-premier-email",
};

const FirstEmailImporter = () => <ResourceArticle config={CONFIG} />;

export default FirstEmailImporter;
