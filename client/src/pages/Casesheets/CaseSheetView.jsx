import PedodonticsView from "./PedodonticsView";
import CompleteDentureCaseSheetView from "./CompleteDentureCaseSheetView";
import FpdCaseSheetView from "./FpdCaseSheetView";
import ImplantView from "./Implantview";
import PartialView from "./Partialview";
import ImplantPatientView from "./ImplantPatientView";
import ConservativeView from "./ConservativeView";
import OralMedicineView from "./OralMedicineView";

const CaseSheetView = ({ caseSheet }) => {
  switch ((caseSheet.department || '').toLowerCase()) {
    case "pedodontics":
      return <PedodonticsView caseData={caseSheet} />;

    case "complete_denture":
      return <CompleteDentureCaseSheetView caseData={caseSheet} />;

    case "fpd":
      return <FpdCaseSheetView caseData={caseSheet} />;

    case "implant":
      return <ImplantView caseData={caseSheet} />;

    case "implant_patient":
      return <ImplantPatientView caseData={caseSheet} />;

    case "partial":
    case "partial_denture":
      return <PartialView caseData={caseSheet} />;

    case "conservativedentistryandendodontics":
    case "conservative dentistry and endodontics":
      return <ConservativeView caseData={caseSheet} />;

    case "general":
    case "generaldentistry":
    case "oral":
    case "oralmedicine":
    case "oralmedicineandradiology":
    case "oralmedicineradiology":
      return <OralMedicineView caseData={caseSheet} />;

    default:
      return <p>Department not supported</p>;
  }
};

export default CaseSheetView;
