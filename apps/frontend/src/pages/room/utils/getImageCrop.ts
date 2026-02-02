/**
 * Konva.Image crop 계산 (object-fit: cover 동작)
 * @see https://konvajs.org/docs/sandbox/Scale_Image_To_Fit.html
 */

interface CropSize {
  width: number
  height: number
}

interface ImageCropResult {
  cropX: number
  cropY: number
  cropWidth: number
  cropHeight: number
}

/**
 * 소스 이미지와 표시 영역 크기로 crop 영역을 계산합니다.
 * 비율을 유지한 채 영역을 채우고(cover), clipPosition에 따라 잘리는 부분을 결정합니다.
 */
export function getImageCrop(image: HTMLImageElement, size: CropSize): ImageCropResult {
  const { width, height } = size

  if (width <= 0 || height <= 0 || width <= 0 || height <= 0) {
    return { cropX: 0, cropY: 0, cropWidth: Math.max(0, width), cropHeight: Math.max(0, height) }
  }

  const aspectRatio = width / height
  const imageRatio = image.width / image.height

  let newWidth: number
  let newHeight: number

  if (aspectRatio >= imageRatio) {
    newWidth = image.width
    newHeight = image.width / aspectRatio
  } else {
    newWidth = image.height * aspectRatio
    newHeight = image.height
  }

  const cropX = (image.width - newWidth) / 2
  const cropY = (image.height - newHeight) / 2

  return {
    cropX,
    cropY,
    cropWidth: newWidth,
    cropHeight: newHeight,
  }
}
