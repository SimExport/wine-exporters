import { ResourceArticle, type ResourceArticleConfig } from "@/components/resources/ResourceArticle";

const CONFIG: ResourceArticleConfig = {
  i18nKey: "followUpStructure",
  path: "/ressources/structurer-relances",
  type: "guide",
  nextHref: "/ressources/modeles-relance",
};

const FollowUpStructure = () => <ResourceArticle config={CONFIG} />;

export default FollowUpStructure;
