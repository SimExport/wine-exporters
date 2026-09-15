import { ResourceArticle, type ResourceArticleConfig } from "@/components/resources/ResourceArticle";

const CONFIG: ResourceArticleConfig = {
  i18nKey: "followUpTasting",
  path: "/ressources/relance-apres-degustation",
  type: "video",
  loomEmbedUrl: "https://www.loom.com/embed/761b4b30c0e94adab177128083dc4013",
};

const TastingFollowUp = () => <ResourceArticle config={CONFIG} />;

export default TastingFollowUp;
