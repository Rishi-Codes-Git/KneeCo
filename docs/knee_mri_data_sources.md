# KneeCo Knee-MRI Data Sources — Preliminary Findings

## Verified sources

### Osteoarthritis Initiative (OAI)

The OAI is hosted in the U.S. National Institute of Mental Health Data Archive (NDA). The official archive describes a multi-centre, ten-year observational study with MRI data, clinical data, and quantitative image analyses from 4,796 subjects. Its image-acquisition page lists separate right and left 3T knee MRI examinations at multiple follow-up points, including sagittal 3D DESS, coronal intermediate-weighted 2D turbo spin echo, and sagittal intermediate-weighted fat-suppressed series. This is the strongest public research source to evaluate for KneeCo’s OA and knee-MRI validation work, but access, governance, and exact usable annotation availability must be checked before use.

URL: <https://nda.nih.gov/oai>

Image-acquisition detail: <https://nda.nih.gov/oai/image-acquisitions>

### Stanford MRNet

Stanford AIMI’s MRNet page states that the dataset contains 1,370 knee MRI examinations from Stanford University Medical Center. It reports meniscal-tear labels extracted from clinical reports and provides a controlled download link through Redivis. It is useful for MRI-level abnormality/meniscal-tear research but does **not** itself establish the pixel-level medial-meniscus masks or thickness labels needed for KneeCo’s measurement workflow.

URL: <https://aimi.stanford.edu/datasets/mrnet-knee-mris>

## Initial suitability conclusion

Neither a raw MRI study nor an exam-level meniscal-tear label alone is sufficient to validate a medial-meniscus thickness system. KneeCo needs MRI studies with physical spacing, plus clinician-reviewed segmentation or landmark annotations for the medial meniscus. A hospital or imaging centre can possess suitable DICOM studies, but any use requires formal permission, de-identification, a defined purpose, and appropriate institutional governance.
