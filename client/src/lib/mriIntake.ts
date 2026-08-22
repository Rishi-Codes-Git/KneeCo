export const maxMriIntakeBytes = 20 * 1024 * 1024;

const acceptedMriFile = /\.(jpg|jpeg|png|pdf)$/i;

export function getMriIntakeError(fileName: string, sizeBytes: number): string | null {
  if (!acceptedMriFile.test(fileName)) {
    return "Please select a JPG, JPEG, PNG, or PDF knee study.";
  }
  if (sizeBytes > maxMriIntakeBytes) {
    return "This intake accepts MRI files up to 20 MB.";
  }
  return null;
}
