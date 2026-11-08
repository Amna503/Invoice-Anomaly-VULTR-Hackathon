#!/bin/bash
# Pre-Deployment Verification Script for Invoice Anomaly Desk
# Run this before deploying to catch issues early

set -e

echo "🔍 Invoice Anomaly Desk - Pre-Deployment Verification"
echo "======================================================"
echo

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Check 1: Node.js version
echo "1️⃣  Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -ge 20 ]; then
    echo -e "${GREEN}✅ Node.js $(node -v) (required: 20+)${NC}"
else
    echo -e "${RED}❌ Node.js $NODE_VERSION (required: 20+)${NC}"
    ((ERRORS++))
fi
echo

# Check 2: Dependencies installed
echo "2️⃣  Checking dependencies..."
cd backend
if [ -d "node_modules" ] && [ -f "package-lock.json" ]; then
    DEPS=$(node -e "const pkg = require('./package.json'); console.log(Object.keys(pkg.dependencies).length)")
    echo -e "${GREEN}✅ $DEPS production dependencies installed${NC}"
else
    echo -e "${RED}❌ Dependencies not installed. Run: npm install${NC}"
    ((ERRORS++))
fi
cd ..
echo

# Check 3: Environment variables
echo "3️⃣  Checking environment configuration..."
if [ -f ".env" ]; then
    echo -e "${GREEN}✅ .env file exists${NC}"

    # Check critical vars
    if grep -q "VULTR_INFERENCE_API_KEY=your-vultr-api-key-here" .env; then
        echo -e "${RED}❌ VULTR_INFERENCE_API_KEY is placeholder${NC}"
        ((ERRORS++))
    else
        echo -e "${GREEN}✅ VULTR_INFERENCE_API_KEY configured${NC}"
    fi

    if grep -q "ADMIN_TOKEN=generate-a-secure-32-character-token-here" .env; then
        echo -e "${RED}❌ ADMIN_TOKEN is placeholder${NC}"
        ((ERRORS++))
    else
        ADMIN_TOKEN_LEN=$(grep "ADMIN_TOKEN=" .env | head -1 | cut -d'=' -f2 | wc -c)
        if [ "$ADMIN_TOKEN_LEN" -ge 32 ]; then
            echo -e "${GREEN}✅ ADMIN_TOKEN configured (${ADMIN_TOKEN_LEN} chars)${NC}"
        else
            echo -e "${YELLOW}⚠️  ADMIN_TOKEN too short (${ADMIN_TOKEN_LEN} chars, need 32+)${NC}"
            ((WARNINGS++))
        fi
    fi

    if grep -q "MONGODB_URI=" .env; then
        echo -e "${GREEN}✅ MONGODB_URI configured${NC}"
    else
        echo -e "${RED}❌ MONGODB_URI missing${NC}"
        ((ERRORS++))
    fi
else
    echo -e "${RED}❌ .env file missing. Copy from .env.example${NC}"
    ((ERRORS++))
fi
echo

# Check 4: File structure
echo "4️⃣  Checking file structure..."
REQUIRED_FILES=(
    "backend/package.json"
    "backend/src/server.js"
    "backend/src/app.js"
    "backend/src/config/env.js"
    "backend/src/config/db.js"
    "docker-compose.yml"
    "backend/Dockerfile"
)

ALL_PRESENT=true
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file${NC}"
    else
        echo -e "${RED}❌ Missing: $file${NC}"
        ALL_PRESENT=false
        ((ERRORS++))
    fi
done
echo

# Check 5: JavaScript syntax
echo "5️⃣  Checking JavaScript syntax..."
cd backend
SYNTAX_ERRORS=0
for file in src/**/*.js; do
    if ! node --check "$file" 2>/dev/null; then
        echo -e "${RED}❌ Syntax error in $file${NC}"
        ((SYNTAX_ERRORS++))
        ((ERRORS++))
    fi
done
if [ $SYNTAX_ERRORS -eq 0 ]; then
    JS_COUNT=$(find src -name "*.js" | wc -l)
    echo -e "${GREEN}✅ All $JS_COUNT JavaScript files valid${NC}"
fi
cd ..
echo

# Check 6: Docker
echo "6️⃣  Checking Docker..."
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✅ Docker installed${NC}"
    if docker info &> /dev/null; then
        echo -e "${GREEN}✅ Docker daemon running${NC}"
    else
        echo -e "${YELLOW}⚠️  Docker daemon not running${NC}"
        ((WARNINGS++))
    fi
else
    echo -e "${YELLOW}⚠️  Docker not installed (optional for local dev)${NC}"
    ((WARNINGS++))
fi
echo

# Check 7: Git status
echo "7️⃣  Checking git status..."
if [ -d ".git" ]; then
    UNCOMMITTED=$(git status --porcelain 2>/dev/null | wc -l)
    if [ "$UNCOMMITTED" -eq 0 ]; then
        echo -e "${GREEN}✅ No uncommitted changes${NC}"
    else
        echo -e "${YELLOW}⚠️  $UNCOMMITTED uncommitted files${NC}"
        echo -e "${YELLOW}   Consider: git add . && git commit${NC}"
        ((WARNINGS++))
    fi
else
    echo -e "${YELLOW}⚠️  Not a git repository${NC}"
    ((WARNINGS++))
fi
echo

# Summary
echo "======================================================"
echo "📊 Verification Summary"
echo "======================================================"
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CHECKS PASSED - READY FOR DEPLOYMENT${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  ${WARNINGS} WARNING(S) - Review before deploying${NC}"
    exit 0
else
    echo -e "${RED}❌ ${ERRORS} ERROR(S), ${WARNINGS} WARNING(S)${NC}"
    echo -e "${RED}Fix errors before deployment${NC}"
    exit 1
fi
