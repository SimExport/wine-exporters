import { ResourceArticle, type ResourceArticleConfig } from "@/components/resources/ResourceArticle";

const CONFIG: ResourceArticleConfig = {
  i18nKey: "followUpTemplates",
  path: "/ressources/modeles-relance",
  type: "template",
};

const FollowUpTemplates = () => <ResourceArticle config={CONFIG} />;

export default FollowUpTemplates;
