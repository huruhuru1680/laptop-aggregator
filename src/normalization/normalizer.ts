import { CanonicalLaptop, NormalizationResult, ExtractedField } from '../types/canonical';
import { AmazonProductPage } from '../types/amazon';
import { FlipkartProductPage } from '../types/flipkart';

export class Normalizer {
  normalizeAmazonProduct(page: AmazonProductPage): NormalizationResult {
    const notes: string[] = [];
    const confidence: Record<string, number> = {};

    const brand = this.extractBrand(page.title, page.specs, notes);
    confidence.brand = brand.source === 'direct' ? 1.0 : brand.source === 'inferred' ? 0.7 : 0.0;

    const modelName = this.extractModelName(page.title, brand.value, notes);
    confidence.model_name = modelName.value ? 0.9 : 0.0;

    const modelFamily = this.extractModelFamily(modelName.value, brand.value, notes);
    confidence.model_family = modelFamily.value ? 0.7 : 0.0;

    const cpu = this.extractCpu(page.title, page.specs, notes);
    confidence.cpu = cpu.source === 'direct' ? 1.0 : cpu.source === 'inferred' ? 0.7 : 0.0;

    const gpu = this.extractGpu(page.title, page.specs, notes);
    confidence.gpu = gpu.source === 'direct' ? 1.0 : gpu.source === 'inferred' ? 0.7 : 0.0;

    const ram = this.extractRam(page.title, page.specs, notes);
    confidence.ram = ram.source === 'direct' ? 1.0 : ram.source === 'inferred' ? 0.8 : 0.0;

    const ramType = this.extractRamType(page.title, page.specs, notes);
    confidence.ram_type = ramType.source === 'direct' ? 1.0 : ramType.source === 'inferred' ? 0.6 : 0.0;

    const storage = this.extractStorage(page.specs, notes);
    confidence.storage = storage.source === 'direct' ? 1.0 : 0.0;

    const storageType = this.extractStorageType(page.specs, notes);
    confidence.storage_type = storageType.source === 'direct' ? 1.0 : 0.0;

    const displaySize = this.extractDisplaySize(page.title, page.specs, notes);
    confidence.display_size = displaySize.source === 'direct' ? 1.0 : displaySize.source === 'inferred' ? 0.8 : 0.0;

    const displayResolution = this.extractDisplayResolution(page.specs, notes);
    confidence.display_resolution = displayResolution.source === 'direct' ? 1.0 : 0.0;

    const refreshRate = this.extractRefreshRate(page.specs, notes);
    confidence.refresh_rate = refreshRate.source === 'direct' ? 1.0 : refreshRate.source === 'inferred' ? 0.5 : 0.0;

    const panelType = this.extractPanelType(page.title, notes);
    confidence.panel_type = panelType.source === 'inferred' ? 0.4 : 0.0;

    const weight = this.extractWeight(page.specs, notes);
    confidence.weight = weight.source === 'direct' ? 1.0 : 0.0;

    const os = this.extractOs(page.specs, notes);
    confidence.os = os.source === 'direct' ? 1.0 : os.source === 'inferred' ? 0.7 : 0.0;

    const discountPercent = this.calculateDiscount(page.price, page.originalPrice);
    confidence.discount_percent = discountPercent.value ? 0.9 : 0.0;

    const laptop: CanonicalLaptop = {
      brand: brand.value || 'Unknown',
      model_family: modelFamily.value,
      model_name: modelName.value || 'Unknown',
      cpu: cpu.value || 'Unknown',
      gpu: gpu.value || 'Unknown',
      ram: ram.value || 0,
      ram_type: ramType.value,
      storage: storage.value || 0,
      storage_type: storageType.value || 'Unknown',
      display_size: displaySize.value || 0,
      display_resolution: displayResolution.value,
      refresh_rate: refreshRate.value,
      panel_type: panelType.value,
      weight: weight.value,
      os: os.value,
      price: page.price || 0,
      original_price: page.originalPrice,
      discount_percent: discountPercent.value,
      seller: page.seller,
      rating: page.rating,
      review_count: page.reviewCount,
      availability: page.availability,
      product_url: page.url,
      image_url: page.imageUrl,
      source: 'amazon_in',
      source_sku: page.asin,
      last_seen: page.capturedAt,
    };

    return { laptop, confidence: confidence as Record<keyof CanonicalLaptop, number>, extraction_notes: notes };
  }

  private extractBrand(
    title: string,
    specs: Record<string, string>,
    notes: string[]
  ): ExtractedField<string> {
    const brandFromSpec = specs['Brand'];
    if (brandFromSpec) {
      return { value: brandFromSpec, confidence: 1.0, source: 'direct' };
    }

    const titleMatch = title.match(/^(ASUS|Dell|HP|Lenovo|Acer|MSI|Apple|Samsung|Toshiba|Microsoft)/i);
    if (titleMatch) {
      return { value: titleMatch[1], confidence: 0.8, source: 'inferred' };
    }

    notes.push('Brand not found in specs, inferred from title');
    return { value: null, confidence: 0.0, source: 'missing' };
  }

  private extractModelName(
    title: string,
    brand: string | null,
    notes: string[]
  ): ExtractedField<string> {
    let cleaned = title.split(',')[0].trim();

    const removePatterns = [
      /\+.*$/,
      /\|.*$/,
      /\(.*\)$/,
      /\s+\d+GB\s+DDR\d+/i,
      /\s+\d+\s*GB\s+RAM/i,
      /Gaming\s*Laptop/i,
    ];

    for (const pattern of removePatterns) {
      cleaned = cleaned.replace(pattern, '').trim();
    }

    if (cleaned !== title) {
      notes.push('Model name cleaned of bundle/OS info');
    }

    return { value: cleaned, confidence: 0.9, source: 'direct' };
  }

  private extractModelFamily(
    modelName: string | null,
    brand: string | null,
    notes: string[]
  ): ExtractedField<string | null> {
    if (!modelName || !brand) {
      return { value: null, confidence: 0.0, source: 'missing' };
    }

    const afterBrand = modelName.replace(new RegExp(`^${brand}\\s*`, 'i'), '');
    const familyMatch = afterBrand.match(/^(G15|ThinkPad|Pavilion|Surface|MacBook|VivoBook|Rog|Strix|Gaming|ProBook|Inspiron|XPS|Legion)/i);

    if (familyMatch) {
      return { value: familyMatch[1], confidence: 0.7, source: 'inferred' };
    }

    notes.push('Model family could not be reliably extracted');
    return { value: null, confidence: 0.0, source: 'missing' };
  }

  private extractCpu(
    title: string,
    specs: Record<string, string>,
    notes: string[]
  ): ExtractedField<string> {
    const cpuFromSpec = specs['CPU Model'];
    if (cpuFromSpec) {
      return { value: cpuFromSpec, confidence: 1.0, source: 'direct' };
    }

    const titleMatch = title.match(/(Intel\s+Core\s+(?:i[3579]-\d+[A-Z]?\d*)|AMD\s+Ryzen\s+\d\s+\d{4}[A-Z]?|Apple\s+M\d)/i);
    if (titleMatch) {
      return { value: titleMatch[1], confidence: 0.9, source: 'inferred' };
    }

    notes.push('CPU not found in specs, not inferred from title');
    return { value: null, confidence: 0.0, source: 'missing' };
  }

  private extractGpu(
    title: string,
    specs: Record<string, string>,
    notes: string[]
  ): ExtractedField<string> {
    const gpuFromSpec = specs['Graphics Co Processor'];
    if (gpuFromSpec) {
      return { value: gpuFromSpec, confidence: 1.0, source: 'direct' };
    }

    const titleMatch = title.match(/(NVIDIA\s+GeForce\s+RTX\s+\d+\s*\w*|AMD\s+Radeon\s+RX\s+\d+\w*|Intel\s+Iris\s+Xe|Apple\s+M\d\s+GPU)/i);
    if (titleMatch) {
      return { value: titleMatch[1], confidence: 0.8, source: 'inferred' };
    }

    notes.push('GPU not found in specs');
    return { value: null, confidence: 0.0, source: 'missing' };
  }

  private extractRam(
    title: string,
    specs: Record<string, string>,
    notes: string[]
  ): ExtractedField<number> {
    const ramFromSpec = specs['RAM Memory Installed Size'];
    if (ramFromSpec) {
      const match = ramFromSpec.match(/(\d+)/);
      if (match) {
        return { value: parseInt(match[1], 10), confidence: 1.0, source: 'direct' };
      }
    }

    const titleMatch = title.match(/(\d+)\s*GB\s+(?:DDR\d+|LPDDR\d+X?)/i);
    if (titleMatch) {
      return { value: parseInt(titleMatch[1], 10), confidence: 0.9, source: 'inferred' };
    }

    notes.push('RAM not found in specs, not inferred from title');
    return { value: null, confidence: 0.0, source: 'missing' };
  }

  private extractRamType(
    title: string,
    specs: Record<string, string>,
    notes: string[]
  ): ExtractedField<string | null> {
    const titleMatch = title.match(/\d+\s*GB\s+(DDR\d+|LPDDR\d+X?)/i);
    if (titleMatch) {
      return { value: titleMatch[1].toUpperCase(), confidence: 0.7, source: 'inferred' };
    }

    notes.push('RAM type not found, set to null');
    return { value: null, confidence: 0.0, source: 'missing' };
  }

  private extractStorage(
    specs: Record<string, string>,
    notes: string[]
  ): ExtractedField<number> {
    const storageFromSpec = specs['Hard Disk Size'];
    if (storageFromSpec) {
      const match = storageFromSpec.match(/(\d+)\s*(?:TB|GB)/i);
      if (match) {
        let size = parseInt(match[1], 10);
        const unit = storageFromSpec.match(/TB/i) ? 'TB' : 'GB';
        if (unit === 'TB') size *= 1024;
        return { value: size, confidence: 1.0, source: 'direct' };
      }
    }

    notes.push('Storage not found in specs');
    return { value: null, confidence: 0.0, source: 'missing' };
  }

  private extractStorageType(
    specs: Record<string, string>,
    notes: string[]
  ): ExtractedField<string> {
    const storageTypeFromSpec = specs['Hard Disk Description'];
    if (storageTypeFromSpec) {
      const type = storageTypeFromSpec.includes('SSD') ? 'SSD' :
                   storageTypeFromSpec.includes('NVMe') ? 'NVMe SSD' :
                   storageTypeFromSpec.includes('HDD') ? 'HDD' : storageTypeFromSpec;
      return { value: type, confidence: 1.0, source: 'direct' };
    }

    notes.push('Storage type not found, defaulting to SSD');
    return { value: 'SSD', confidence: 0.3, source: 'inferred' };
  }

  private extractDisplaySize(
    title: string,
    specs: Record<string, string>,
    notes: string[]
  ): ExtractedField<number> {
    const sizeFromSpec = specs['Screen Size'];
    if (sizeFromSpec) {
      const match = sizeFromSpec.match(/([\d.]+)\s*(?:Inches|")/i);
      if (match) {
        return { value: parseFloat(match[1]), confidence: 1.0, source: 'direct' };
      }
    }

    const titleMatch = title.match(/(\d[\d.]*)\s*(?:inch|inches|"|\.)/i);
    if (titleMatch) {
      return { value: parseFloat(titleMatch[1]), confidence: 0.8, source: 'inferred' };
    }

    notes.push('Display size not found');
    return { value: null, confidence: 0.0, source: 'missing' };
  }

  private extractDisplayResolution(
    specs: Record<string, string>,
    notes: string[]
  ): ExtractedField<string | null> {
    const resFromSpec = specs['Native Resolution'];
    if (resFromSpec) {
      const match = resFromSpec.match(/(\d+)\s*[xX×]\s*(\d+)/);
      if (match) {
        return { value: `${match[1]}x${match[2]}`, confidence: 1.0, source: 'direct' };
      }
    }

    notes.push('Display resolution not found');
    return { value: null, confidence: 0.0, source: 'missing' };
  }

  private extractRefreshRate(
    specs: Record<string, string>,
    notes: string[]
  ): ExtractedField<number | null> {
    const refreshFromSpec = specs['Refresh Rate'];
    if (refreshFromSpec) {
      const match = refreshFromSpec.match(/(\d+)\s*(?:Hz|hertz)/i);
      if (match) {
        return { value: parseInt(match[1], 10), confidence: 1.0, source: 'direct' };
      }
    }

    notes.push('Refresh rate not found');
    return { value: null, confidence: 0.0, source: 'missing' };
  }

  private extractPanelType(
    title: string,
    notes: string[]
  ): ExtractedField<string | null> {
    const panelMatch = title.match(/(IPS|OLED|LED|TN|WVA)/i);
    if (panelMatch) {
      return { value: panelMatch[1].toUpperCase(), confidence: 0.4, source: 'inferred' };
    }

    notes.push('Panel type not found, set to null');
    return { value: null, confidence: 0.0, source: 'missing' };
  }

  private extractWeight(
    specs: Record<string, string>,
    notes: string[]
  ): ExtractedField<number | null> {
    const weightFromSpec = specs['Item Weight'];
    if (weightFromSpec) {
      const match = weightFromSpec.match(/([\d.]+)\s*(?:kg|kilograms|g|grams)/i);
      if (match) {
        let weight = parseFloat(match[1]);
        const unit = weightFromSpec.toLowerCase();
        if (unit.includes('g')) weight /= 1000;
        return { value: Math.round(weight * 100) / 100, confidence: 1.0, source: 'direct' };
      }
    }

    notes.push('Weight not found');
    return { value: null, confidence: 0.0, source: 'missing' };
  }

  private extractOs(
    specs: Record<string, string>,
    notes: string[]
  ): ExtractedField<string | null> {
    const osFromSpec = specs['Operating System'];
    if (osFromSpec) {
      return { value: osFromSpec, confidence: 1.0, source: 'direct' };
    }

    notes.push('OS not found');
    return { value: null, confidence: 0.0, source: 'missing' };
  }

  private calculateDiscount(
    price: number | null,
    originalPrice: number | null
  ): ExtractedField<number | null> {
    if (!price || !originalPrice || originalPrice <= price) {
      return { value: null, confidence: 0.0, source: 'missing' };
    }

    const discount = Math.round(((originalPrice - price) / originalPrice) * 100);
    return { value: discount, confidence: 0.9, source: 'direct' };
  }

  normalizeFlipkartProduct(page: FlipkartProductPage): NormalizationResult {
    const notes: string[] = [];
    const confidence: Record<string, number> = {};

    const brand = this.extractBrand(page.title, page.specs, notes);
    confidence.brand = brand.source === 'direct' ? 1.0 : brand.source === 'inferred' ? 0.7 : 0.0;

    const modelName = this.extractModelName(page.title, brand.value, notes);
    confidence.model_name = modelName.value ? 0.9 : 0.0;

    const modelFamily = this.extractModelFamily(modelName.value, brand.value, notes);
    confidence.model_family = modelFamily.value ? 0.7 : 0.0;

    const cpu = this.extractCpu(page.title, page.specs, notes);
    confidence.cpu = cpu.source === 'direct' ? 1.0 : cpu.source === 'inferred' ? 0.7 : 0.0;

    const gpu = this.extractGpu(page.title, page.specs, notes);
    confidence.gpu = gpu.source === 'direct' ? 1.0 : gpu.source === 'inferred' ? 0.7 : 0.0;

    const ram = this.extractRam(page.title, page.specs, notes);
    confidence.ram = ram.source === 'direct' ? 1.0 : ram.source === 'inferred' ? 0.8 : 0.0;

    const ramType = this.extractRamType(page.title, page.specs, notes);
    confidence.ram_type = ramType.source === 'direct' ? 1.0 : ramType.source === 'inferred' ? 0.6 : 0.0;

    const storage = this.extractStorage(page.specs, notes);
    confidence.storage = storage.source === 'direct' ? 1.0 : 0.0;

    const storageType = this.extractStorageType(page.specs, notes);
    confidence.storage_type = storageType.source === 'direct' ? 1.0 : 0.0;

    const displaySize = this.extractDisplaySize(page.title, page.specs, notes);
    confidence.display_size = displaySize.source === 'direct' ? 1.0 : displaySize.source === 'inferred' ? 0.8 : 0.0;

    const displayResolution = this.extractDisplayResolution(page.specs, notes);
    confidence.display_resolution = displayResolution.source === 'direct' ? 1.0 : 0.0;

    const refreshRate = this.extractRefreshRate(page.specs, notes);
    confidence.refresh_rate = refreshRate.source === 'direct' ? 1.0 : refreshRate.source === 'inferred' ? 0.5 : 0.0;

    const panelType = this.extractPanelType(page.title, notes);
    confidence.panel_type = panelType.source === 'inferred' ? 0.4 : 0.0;

    const weight = this.extractWeight(page.specs, notes);
    confidence.weight = weight.source === 'direct' ? 1.0 : 0.0;

    const os = this.extractOs(page.specs, notes);
    confidence.os = os.source === 'direct' ? 1.0 : os.source === 'inferred' ? 0.7 : 0.0;

    const discountPercent = this.calculateDiscount(page.price, page.originalPrice);
    confidence.discount_percent = discountPercent.value ? 0.9 : 0.0;

    const laptop: CanonicalLaptop = {
      brand: brand.value || 'Unknown',
      model_family: modelFamily.value,
      model_name: modelName.value || 'Unknown',
      cpu: cpu.value || 'Unknown',
      gpu: gpu.value || 'Unknown',
      ram: ram.value || 0,
      ram_type: ramType.value,
      storage: storage.value || 0,
      storage_type: storageType.value || 'Unknown',
      display_size: displaySize.value || 0,
      display_resolution: displayResolution.value,
      refresh_rate: refreshRate.value,
      panel_type: panelType.value,
      weight: weight.value,
      os: os.value,
      price: page.price || 0,
      original_price: page.originalPrice,
      discount_percent: discountPercent.value,
      seller: page.seller,
      rating: page.rating,
      review_count: page.reviewCount,
      availability: page.availability,
      product_url: page.url,
      image_url: page.imageUrl,
      source: 'flipkart',
      source_sku: page.pid,
      last_seen: page.capturedAt,
    };

    return { laptop, confidence: confidence as Record<keyof CanonicalLaptop, number>, extraction_notes: notes };
  }

  calculateOverallConfidence(confidence: Record<string, number>): number {
    const requiredFields = ['brand', 'model_name', 'cpu', 'gpu', 'ram', 'storage', 'display_size', 'price'];
    const values = requiredFields.map(f => confidence[f] || 0);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return Math.round(avg * 100);
  }

  analyzeConfidence(result: NormalizationResult, threshold: number = 0.7): ConfidenceAnalysis {
    const lowConfidenceFields: Array<{ field: string; score: number; source: string }> = [];

    for (const [field, score] of Object.entries(result.confidence)) {
      if (score < threshold) {
        const source = result.extraction_notes.find(n => n.toLowerCase().includes(field.toLowerCase())) || 'unknown';
        lowConfidenceFields.push({ field, score, source });
      }
    }

    return {
      overallConfidence: this.calculateOverallConfidence(result.confidence),
      lowConfidenceFields,
      totalFields: Object.keys(result.confidence).length,
      extractionNotes: result.extraction_notes,
    };
  }

  aggregateConfidenceAnalysis(results: NormalizationResult[]): AggregatedConfidenceAnalysis {
    if (results.length === 0) {
      return {
        totalProducts: 0,
        averageConfidence: 0,
        productsAbove80: 0,
        fieldAnalysis: [],
      };
    }

    const overallConfidences = results.map(r => this.calculateOverallConfidence(r.confidence));
    const averageConfidence = Math.round(overallConfidences.reduce((a, b) => a + b, 0) / results.length);
    const productsAbove80 = overallConfidences.filter(c => c >= 80).length;

    const fieldNames = Object.keys(results[0].confidence);
    const fieldAnalysis = fieldNames.map(field => {
      const scores = results.map(r => r.confidence[field] || 0);
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      const belowThreshold = scores.filter(s => s < 0.7).length;
      return {
        field,
        averageScore: Math.round(avgScore * 100) / 100,
        productsBelowThreshold: belowThreshold,
        percentageBelowThreshold: Math.round((belowThreshold / results.length) * 100),
      };
    });

    return {
      totalProducts: results.length,
      averageConfidence,
      productsAbove80,
      fieldAnalysis: fieldAnalysis.sort((a, b) => a.averageScore - b.averageScore),
    };
  }
}

export interface ConfidenceAnalysis {
  overallConfidence: number;
  lowConfidenceFields: Array<{ field: string; score: number; source: string }>;
  totalFields: number;
  extractionNotes: string[];
}

export interface AggregatedConfidenceAnalysis {
  totalProducts: number;
  averageConfidence: number;
  productsAbove80: number;
  fieldAnalysis: Array<{
    field: string;
    averageScore: number;
    productsBelowThreshold: number;
    percentageBelowThreshold: number;
  }>;
}