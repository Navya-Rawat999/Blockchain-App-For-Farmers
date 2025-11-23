import QRCode from 'qrcode'
import { v2 as cloudinary } from 'cloudinary'

class QRCodeGenerator {
  constructor() {
    this.baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
  }

  /**
   * Generate QR code data for produce
   * @param {Object} produceData - The produce information from database and blockchain
   * @returns {Object} QR data and display URL
   */
  generateProduceQRData(produceData) {
    const qrData = {
      type: 'produce',
      id: produceData.blockchainId || produceData.id,
      name: produceData.name,
      quantity: produceData.quantity || '1 unit',
      farmer: produceData.originalFarmer,
      farm: produceData.originFarm,
      timestamp: Date.now(),
      version: '1.0'
    }

    // Create URL that links to the produce details page
    const produceUrl = `${this.baseUrl}/HTML/customer.html?produce=${qrData.id}`
    
    // Create QR string that contains both data and URL
    const qrString = JSON.stringify({
      ...qrData,
      url: produceUrl
    })

    return {
      data: qrString,
      displayUrl: produceUrl,
      qrData: qrData
    }
  }

  /**
   * Generate QR code image as base64 data URL
   * @param {string} qrString - The QR data string
   * @param {Object} options - QR code generation options
   * @returns {Promise<string>} Base64 data URL of QR code image
   */
  async generateQRCodeImage(qrString, options = {}) {
    const defaultOptions = {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M',
      type: 'image/png'
    }

    const qrOptions = { ...defaultOptions, ...options }

    try {
      const dataUrl = await QRCode.toDataURL(qrString, qrOptions)
      return dataUrl
    } catch (error) {
      console.error('QR Code generation failed:', error)
      throw new Error('Failed to generate QR code')
    }
  }

  /**
   * Generate QR code and upload to Cloudinary
   * @param {Object} produceData - The produce information
   * @returns {Promise<Object>} QR info with Cloudinary URL
   */
  async generateAndUploadQRCode(produceData) {
    try {
      const qrInfo = this.generateProduceQRData(produceData)
      const qrImageDataUrl = await this.generateQRCodeImage(qrInfo.data)

      // Upload to Cloudinary
      const uploadResult = await cloudinary.uploader.upload(qrImageDataUrl, {
        folder: 'qr-codes',
        public_id: `qr-produce-${qrInfo.qrData.id}-${Date.now()}`,
        overwrite: true,
        resource_type: 'image'
      })

      return {
        ...qrInfo,
        qrImageUrl: uploadResult.secure_url,
        qrImagePublicId: uploadResult.public_id
      }
    } catch (error) {
      console.error('QR code generation and upload failed:', error)
      throw new Error('Failed to generate and upload QR code')
    }
  }

  /**
   * Parse QR code data
   * @param {string} qrString - The scanned QR string
   * @returns {Object} Parsed QR data
   */
  parseQRData(qrString) {
    try {
      const data = JSON.parse(qrString)
      if (data.type === 'produce' && data.id) {
        return data
      } else {
        throw new Error('Invalid QR code format')
      }
    } catch (error) {
      // Fallback for simple ID strings
      if (/^\d+$/.test(qrString)) {
        return {
          type: 'produce',
          id: qrString,
          legacy: true
        }
      }
      throw new Error('Unable to parse QR code data')
    }
  }
}

export default QRCodeGenerator
