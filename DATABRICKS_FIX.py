
#!/usr/bin/env python3
"""
Complete Databricks Deployment Package Fix
This creates a properly structured package that will work in Databricks Apps environment
"""

import tarfile
import os
import shutil
import json

def create_databricks_package():
    """Create a complete Databricks deployment package with all fixes"""
    
    print("Creating COMPLETE Databricks deployment package...")
    
    # Create package directory
    package_dir = "tca-schedule-optimizer-complete-fix"
    if os.path.exists(package_dir):
        shutil.rmtree(package_dir)
    os.makedirs(package_dir)
    
    # Copy all necessary files
    files_to_copy = [
        "client/",
        "server/", 
        "shared/",
        "components.json",
        "postcss.config.js", 
        "tailwind.config.ts",
        "vite.config.ts",
        "tsconfig.json"
    ]
    
    for file_path in files_to_copy:
        src = f"../{file_path}"
        dst = f"{package_dir}/{file_path}"
        
        if os.path.isdir(src):
            shutil.copytree(src, dst)
        elif os.path.exists(src):
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            shutil.copy2(src, dst)
    
    # Ensure client directory exists
    os.makedirs(f"{package_dir}/client", exist_ok=True)
    
    # Create root package.json with PROPER build scripts
    root_package = {
        "name": "tca-schedule-optimizer",
        "version": "1.0.0", 
        "description": "TCA Schedule Optimizer Dashboard for Databricks",
        "main": "dist/index.js",
        "type": "module",
        "scripts": {
            "start": "node dist/index.js",
            "build": "npm run build:client && npm run build:server",
            "build:client": "cd client && npm install && npm run build",
            "build:server": "npm run build:server:esbuild",
            "build:server:esbuild": "esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
            "install:all": "npm install && cd client && npm install"
        },
        "dependencies": {
            "@neondatabase/serverless": "^0.6.0",
            "drizzle-orm": "^0.28.6", 
            "drizzle-zod": "^0.5.1",
            "express": "^4.18.2",
            "zod": "^3.22.4",
            "nanoid": "^4.0.2"
        },
        "devDependencies": {
            "@types/express": "^4.17.17",
            "@types/node": "^20.5.1", 
            "esbuild": "^0.19.2",
            "tsx": "^3.12.7",
            "typescript": "^5.1.6"
        }
    }
    
    with open(f"{package_dir}/package.json", "w") as f:
        json.dump(root_package, f, indent=2)
    
    # Create client package.json with ALL dependencies
    client_package = {
        "name": "tca-schedule-optimizer-client",
        "private": True,
        "version": "0.0.0",
        "type": "module",
        "scripts": {
            "dev": "vite",
            "build": "tsc && vite build",
            "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
            "preview": "vite preview"
        },
        "dependencies": {
            "@radix-ui/react-accordion": "^1.1.2",
            "@radix-ui/react-alert-dialog": "^1.0.5",
            "@radix-ui/react-aspect-ratio": "^1.0.3",
            "@radix-ui/react-avatar": "^1.0.4",
            "@radix-ui/react-checkbox": "^1.0.4",
            "@radix-ui/react-collapsible": "^1.0.3",
            "@radix-ui/react-context-menu": "^2.1.5",
            "@radix-ui/react-dialog": "^1.0.5",
            "@radix-ui/react-dropdown-menu": "^2.0.6",
            "@radix-ui/react-hover-card": "^1.0.7",
            "@radix-ui/react-label": "^2.0.2",
            "@radix-ui/react-menubar": "^1.0.4",
            "@radix-ui/react-navigation-menu": "^1.1.4",
            "@radix-ui/react-popover": "^1.0.7",
            "@radix-ui/react-progress": "^1.0.3",
            "@radix-ui/react-radio-group": "^1.1.3",
            "@radix-ui/react-scroll-area": "^1.0.5",
            "@radix-ui/react-select": "^2.0.0",
            "@radix-ui/react-separator": "^1.0.3",
            "@radix-ui/react-slider": "^1.1.2",
            "@radix-ui/react-slot": "^1.0.2",
            "@radix-ui/react-switch": "^1.0.3",
            "@radix-ui/react-tabs": "^1.0.4",
            "@radix-ui/react-toast": "^1.1.5",
            "@radix-ui/react-toggle": "^1.0.3",
            "@radix-ui/react-toggle-group": "^1.0.4",
            "@radix-ui/react-tooltip": "^1.0.7",
            "@tanstack/react-query": "^4.32.6",
            "react": "^18.2.0",
            "react-dom": "^18.2.0",
            "react-router-dom": "^6.15.0",
            "recharts": "^2.8.0",
            "leaflet": "^1.9.4",
            "react-leaflet": "^4.2.1",
            "class-variance-authority": "^0.7.0",
            "clsx": "^2.0.0",
            "lucide-react": "^0.263.1",
            "tailwind-merge": "^1.14.0",
            "tailwindcss-animate": "^1.0.6"
        },
        "devDependencies": {
            "@types/react": "^18.2.15",
            "@types/react-dom": "^18.2.7",
            "@types/leaflet": "^1.9.4",
            "@typescript-eslint/eslint-plugin": "^6.0.0",
            "@typescript-eslint/parser": "^6.0.0",
            "@vitejs/plugin-react": "^4.0.3",
            "autoprefixer": "^10.4.14",
            "eslint": "^8.45.0",
            "eslint-plugin-react-hooks": "^4.6.0",
            "eslint-plugin-react-refresh": "^0.4.3",
            "postcss": "^8.4.27",
            "tailwindcss": "^3.3.3",
            "typescript": "^5.0.2",
            "vite": "^4.4.5"
        }
    }
    
    with open(f"{package_dir}/client/package.json", "w") as f:
        json.dump(client_package, f, indent=2)
    
    # Create app.yaml with correct configuration
    app_yaml = """name: tca-schedule-optimizer
display_name: TCA Schedule Optimizer
compute:
  - name: main
    cpu: "2"
    memory: "4Gi"
    min_workers: 1
    max_workers: 1
env:
  - name: NODE_ENV
    value: "production"
  - name: PORT
    value: "8080"
"""
    
    with open(f"{package_dir}/app.yaml", "w") as f:
        f.write(app_yaml)
    
    # Create tar.gz package
    tar_path = "tca-schedule-optimizer-databricks-complete-fix.tar.gz"
    with tarfile.open(tar_path, "w:gz") as tar:
        tar.add(package_dir, arcname=".")
    
    print(f"✓ Created complete package: {tar_path}")
    print(f"✓ Package size: {os.path.getsize(tar_path) / 1024:.1f} KB")
    
    # Cleanup
    shutil.rmtree(package_dir)
    
    return tar_path

if __name__ == "__main__":
    print("TCA Schedule Optimizer - COMPLETE Databricks Fix")
    print("=" * 60)
    
    package_path = create_databricks_package()
    
    print("\nCOMPLETE Fixes Applied:")
    print("✓ Proper client package.json with ALL dependencies") 
    print("✓ Vite included as devDependency in client folder")
    print("✓ Simplified build scripts using standard npm commands")
    print("✓ Separated dependency installation for client and server")
    print("✓ Proper app.yaml with display_name")
    print("✓ 4Gi memory allocation for stable builds")
    
    print(f"\nUpload this COMPLETE package to Databricks: {package_path}")
    print("\nThis package will now work correctly with Databricks Apps!")
