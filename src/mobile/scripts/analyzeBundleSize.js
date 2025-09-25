#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Simple bundle size analyzer for React Native
class BundleAnalyzer {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.dependencies = {};
    this.totalSize = 0;
  }

  async analyze() {
    console.log('🔍 Analyzing bundle size...\n');

    // Read package.json
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    // Analyze dependencies
    await this.analyzeDependencies(packageJson.dependencies || {});
    await this.analyzeDependencies(packageJson.devDependencies || {}, true);

    // Analyze source code
    await this.analyzeSourceCode();

    // Generate report
    this.generateReport();
  }

  async analyzeDependencies(deps, isDev = false) {
    const type = isDev ? 'devDependencies' : 'dependencies';
    console.log(`📦 Analyzing ${type}...`);

    for (const [name, version] of Object.entries(deps)) {
      try {
        const packagePath = path.join(this.projectRoot, 'node_modules', name);
        if (fs.existsSync(packagePath)) {
          const size = await this.getDirectorySize(packagePath);
          this.dependencies[name] = {
            version,
            size,
            type,
            sizeFormatted: this.formatBytes(size)
          };
          this.totalSize += size;
        }
      } catch (error) {
        console.warn(`⚠️  Could not analyze ${name}:`, error.message);
      }
    }
  }

  async analyzeSourceCode() {
    console.log('📱 Analyzing source code...');
    
    const srcPath = path.join(this.projectRoot, 'src');
    if (fs.existsSync(srcPath)) {
      const srcSize = await this.getDirectorySize(srcPath);
      this.dependencies['[Source Code]'] = {
        version: 'local',
        size: srcSize,
        type: 'source',
        sizeFormatted: this.formatBytes(srcSize)
      };
    }

    // Analyze specific directories
    const directories = ['screens', 'components', 'services', 'hooks', 'assets'];
    for (const dir of directories) {
      const dirPath = path.join(this.projectRoot, dir);
      if (fs.existsSync(dirPath)) {
        const dirSize = await this.getDirectorySize(dirPath);
        this.dependencies[`[${dir}]`] = {
          version: 'local',
          size: dirSize,
          type: 'source',
          sizeFormatted: this.formatBytes(dirSize)
        };
      }
    }
  }

  async getDirectorySize(dirPath) {
    let totalSize = 0;

    const items = fs.readdirSync(dirPath);
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);

      if (stats.isDirectory()) {
        totalSize += await this.getDirectorySize(itemPath);
      } else {
        totalSize += stats.size;
      }
    }

    return totalSize;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  generateReport() {
    console.log('\n📊 Bundle Size Report');
    console.log('='.repeat(50));

    // Sort by size (largest first)
    const sortedDeps = Object.entries(this.dependencies)
      .sort(([, a], [, b]) => b.size - a.size);

    // Top 20 largest dependencies
    console.log('\n🔝 Top 20 Largest Dependencies:');
    console.log('-'.repeat(50));
    
    sortedDeps.slice(0, 20).forEach(([name, info], index) => {
      const icon = info.type === 'source' ? '📱' : '📦';
      console.log(`${index + 1}. ${icon} ${name.padEnd(30)} ${info.sizeFormatted.padStart(10)}`);
    });

    // Summary by type
    console.log('\n📈 Summary by Type:');
    console.log('-'.repeat(50));
    
    const summary = {};
    Object.values(this.dependencies).forEach(dep => {
      if (!summary[dep.type]) {
        summary[dep.type] = { count: 0, size: 0 };
      }
      summary[dep.type].count++;
      summary[dep.type].size += dep.size;
    });

    Object.entries(summary).forEach(([type, info]) => {
      console.log(`${type.padEnd(20)} ${info.count.toString().padStart(5)} packages ${this.formatBytes(info.size).padStart(10)}`);
    });

    console.log('\n💾 Total Bundle Size:', this.formatBytes(this.totalSize));

    // Recommendations
    this.generateRecommendations(sortedDeps);
  }

  generateRecommendations(sortedDeps) {
    console.log('\n💡 Optimization Recommendations:');
    console.log('-'.repeat(50));

    const largeDeps = sortedDeps.filter(([, info]) => info.size > 1024 * 1024); // > 1MB
    
    if (largeDeps.length > 0) {
      console.log('\n🚨 Large Dependencies (>1MB):');
      largeDeps.forEach(([name, info]) => {
        if (!name.startsWith('[')) {
          console.log(`   • Consider if ${name} is necessary or if there's a lighter alternative`);
        }
      });
    }

    console.log('\n✅ General Recommendations:');
    console.log('   • Use dynamic imports for large components');
    console.log('   • Implement code splitting where possible');
    console.log('   • Remove unused dependencies');
    console.log('   • Use tree shaking for libraries that support it');
    console.log('   • Consider using React Native\'s built-in components instead of third-party ones');
    console.log('   • Optimize images and use appropriate formats');
  }
}

// Run the analyzer
const analyzer = new BundleAnalyzer(process.cwd());
analyzer.analyze().catch(console.error);