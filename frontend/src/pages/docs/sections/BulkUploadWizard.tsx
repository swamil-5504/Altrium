import { DocPage, Sub, Ul } from "../_shared";
import { useDocsContent } from "../content";

const BulkUploadWizardDocs = () => {
  const page = useDocsContent().pages.comingSoon.bulkUploadWizard;

  return (
    <DocPage kicker="Platform Ops" title={page.title} summary={page.tagline}>
      <p className="text-muted-foreground mb-8">{page.intro}</p>

      <Sub id="features" title="Features">
        <Ul>
          {page.features.map((item: string, i: number) => (
            <li key={i}>{item}</li>
          ))}
        </Ul>
      </Sub>
    </DocPage>
  );
};

export default BulkUploadWizardDocs;
