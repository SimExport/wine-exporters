import { ResourceArticle, type ResourceArticleConfig } from "@/components/resources/ResourceArticle";

const CONFIG: ResourceArticleConfig = {
  i18nKey: "respondOpportunity",
  path: "/ressources/repondre-opportunite",
  type: "template",
  nextHref: "/ressources/envoi-echantillons",
};

const RespondOpportunity = () => <ResourceArticle config={CONFIG} />;

export default RespondOpportunity;
