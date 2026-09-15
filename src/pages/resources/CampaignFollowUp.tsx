import { ResourceArticle, type ResourceArticleConfig } from "@/components/resources/ResourceArticle";

const CONFIG: ResourceArticleConfig = {
  i18nKey: "followCampaign",
  path: "/ressources/suivi-campagne-wineexporters",
  type: "template",
  nextHref: "/ressources/structurer-relances",
};

const CampaignFollowUp = () => <ResourceArticle config={CONFIG} />;

export default CampaignFollowUp;
