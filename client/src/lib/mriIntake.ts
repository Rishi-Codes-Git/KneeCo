export const maxMriIntakeBytes = 20 * 1024 * 1024;

const acceptedMriFile = /\.(dcm|nii|nii\.gz)$/i;

export function getMriIntakeError(fileName: string, sizeBytes: number): string | null {
  if (!acceptedMriFile.test(fileName)) {
    return "Please select a DICOM (.dcm) or NIfTI (.nii/.nii.gz) knee MRI file.";
  }
  if (sizeBytes > maxMriIntakeBytes) {
    return "This intake accepts MRI files up to 20 MB.";
  }
  return null;
}
