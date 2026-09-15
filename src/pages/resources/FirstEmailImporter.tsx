import { ResourceArticle, type ResourceArticleConfig } from "@/components/resources/ResourceArticle";

const CONFIG: ResourceArticleConfig = {
  i18nKey: "firstEmail",
  path: "/ressources/premier-email-importateur",
  type: "guide",
  // nextHref: "/ressources/documents-premier-email" — à activer quand la ressource existera.
};

const FirstEmailImporter = () => <ResourceArticle config={CONFIG} />;

export default FirstEmailImporter;
