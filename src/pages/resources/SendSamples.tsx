import { ResourceArticle, type ResourceArticleConfig } from "@/components/resources/ResourceArticle";

const CONFIG: ResourceArticleConfig = {
  i18nKey: "sendSamples",
  path: "/ressources/envoi-echantillons",
  type: "video",
  loomEmbedUrl: "https://www.loom.com/embed/4ac94b14e65843afaa809fefc112a4cb",
  nextHref: "/ressources/relance-apres-degustation",
};

const SendSamples = () => <ResourceArticle config={CONFIG} />;

export default SendSamples;
