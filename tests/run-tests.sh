#!/bin/bash

# SaaS Notes App - Automated Test Script
# Usage: API_BASE_URL=https://your-app.vercel.app ./tests/run-tests.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL=${API_BASE_URL:-"http://localhost:3000"}
TIMEOUT=30

echo -e "${YELLOW}🧪 Starting SaaS Notes App Test Suite${NC}"
echo -e "${YELLOW}📍 API Base URL: $API_BASE_URL${NC}"
echo ""

# Helper function for API calls
api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    local token=$4
    
    if [ -z "$token" ]; then
        curl -s -X "$method" \
             -H "Content-Type: application/json" \
             -H "Accept: application/json" \
             --max-time $TIMEOUT \
             --data "$data" \
             "$API_BASE_URL$endpoint"
    else
        curl -s -X "$method" \
             -H "Content-Type: application/json" \
             -H "Accept: application/json" \
             -H "Authorization: Bearer $token" \
             --max-time $TIMEOUT \
             --data "$data" \
             "$API_BASE_URL$endpoint"
    fi
}

# Test 1: Health Check
echo -e "${YELLOW}Test 1: Health Check${NC}"
health_response=$(api_call "GET" "/api/health" "")
if echo "$health_response" | grep -q '"status":"ok"'; then
    echo -e "${GREEN}✅ Health check passed${NC}"
else
    echo -e "${RED}❌ Health check failed: $health_response${NC}"
    exit 1
fi
echo ""

# Test 2: Login with all seeded accounts
echo -e "${YELLOW}Test 2: Authentication${NC}"

accounts=("admin@acme.test" "user@acme.test" "admin@globex.test" "user@globex.test")
tokens=()

for email in "${accounts[@]}"; do
    login_data='{"email":"'$email'","password":"password"}'
    login_response=$(api_call "POST" "/api/auth/login" "$login_data")
    
    if echo "$login_response" | grep -q '"token"'; then
        token=$(echo "$login_response" | sed 's/.*"token":"\([^"]*\)".*/\1/')
        tokens+=("$token")
        echo -e "${GREEN}✅ Login successful for $email${NC}"
    else
        echo -e "${RED}❌ Login failed for $email: $login_response${NC}"
        exit 1
    fi
done
echo ""

# Assign tokens for easier reference
ACME_ADMIN_TOKEN=${tokens[0]}
ACME_USER_TOKEN=${tokens[1]}
GLOBEX_ADMIN_TOKEN=${tokens[2]}
GLOBEX_USER_TOKEN=${tokens[3]}

# Test 3: Cross-tenant isolation
echo -e "${YELLOW}Test 3: Cross-tenant isolation${NC}"

# Create a note as Acme user
acme_note_data='{"title":"Acme Secret Note","content":"This should only be visible to Acme"}'
acme_note_response=$(api_call "POST" "/api/notes" "$acme_note_data" "$ACME_USER_TOKEN")

if echo "$acme_note_response" | grep -q '"id"'; then
    acme_note_id=$(echo "$acme_note_response" | sed 's/.*"id":\([0-9]*\).*/\1/')
    echo -e "${GREEN}✅ Created note in Acme tenant (ID: $acme_note_id)${NC}"
else
    echo -e "${RED}❌ Failed to create note in Acme tenant: $acme_note_response${NC}"
    exit 1
fi

# Try to access the Acme note from Globex user (should fail)
globex_access_response=$(api_call "GET" "/api/notes/$acme_note_id" "" "$GLOBEX_USER_TOKEN")
if echo "$globex_access_response" | grep -q '"error"'; then
    echo -e "${GREEN}✅ Cross-tenant access properly blocked${NC}"
else
    echo -e "${RED}❌ Cross-tenant access not blocked: $globex_access_response${NC}"
    exit 1
fi
echo ""

# Test 4: Role-based authorization
echo -e "${YELLOW}Test 4: Role-based authorization${NC}"

# Try to invite user as member (should fail)
invite_data='{"email":"newuser@acme.test","role":"member"}'
member_invite_response=$(api_call "POST" "/api/tenants/acme/invite" "$invite_data" "$ACME_USER_TOKEN")

if echo "$member_invite_response" | grep -q '"error":"Forbidden"'; then
    echo -e "${GREEN}✅ Member cannot invite users${NC}"
else
    echo -e "${RED}❌ Member authorization not working: $member_invite_response${NC}"
    exit 1
fi

# Try to upgrade tenant as member (should fail)
member_upgrade_response=$(api_call "POST" "/api/tenants/acme/upgrade" "" "$ACME_USER_TOKEN")

if echo "$member_upgrade_response" | grep -q '"error":"Forbidden"'; then
    echo -e "${GREEN}✅ Member cannot upgrade tenant${NC}"
else
    echo -e "${RED}❌ Member upgrade authorization not working: $member_upgrade_response${NC}"
    exit 1
fi
echo ""

# Test 5: Free plan note limits
echo -e "${YELLOW}Test 5: Free plan note limits${NC}"

# Create notes up to the limit (3 total, already have 1)
for i in 2 3; do
    note_data='{"title":"Test Note '$i'","content":"Content '$i'"}'
    note_response=$(api_call "POST" "/api/notes" "$note_data" "$ACME_USER_TOKEN")
    
    if echo "$note_response" | grep -q '"id"'; then
        echo -e "${GREEN}✅ Created note $i${NC}"
    else
        echo -e "${RED}❌ Failed to create note $i: $note_response${NC}"
        exit 1
    fi
done

# Try to create 4th note (should fail for free plan)
fourth_note_data='{"title":"Fourth Note","content":"This should fail"}'
fourth_note_response=$(api_call "POST" "/api/notes" "$fourth_note_data" "$ACME_USER_TOKEN")

if echo "$fourth_note_response" | grep -q '"error":"note_limit_reached"'; then
    echo -e "${GREEN}✅ Free plan note limit enforced${NC}"
else
    echo -e "${RED}❌ Free plan limit not enforced: $fourth_note_response${NC}"
    exit 1
fi
echo ""

# Test 6: Tenant upgrade (Admin only)
echo -e "${YELLOW}Test 6: Tenant upgrade${NC}"

upgrade_response=$(api_call "POST" "/api/tenants/acme/upgrade" "" "$ACME_ADMIN_TOKEN")

if echo "$upgrade_response" | grep -q '"plan":"pro"'; then
    echo -e "${GREEN}✅ Tenant upgrade successful${NC}"
else
    echo -e "${RED}❌ Tenant upgrade failed: $upgrade_response${NC}"
    exit 1
fi

# Now try to create 4th note (should succeed after upgrade)
fourth_note_after_upgrade=$(api_call "POST" "/api/notes" "$fourth_note_data" "$ACME_USER_TOKEN")

if echo "$fourth_note_after_upgrade" | grep -q '"id"'; then
    echo -e "${GREEN}✅ Note creation works after Pro upgrade${NC}"
else
    echo -e "${RED}❌ Note creation failed after upgrade: $fourth_note_after_upgrade${NC}"
    exit 1
fi
echo ""

# Test 7: CRUD operations
echo -e "${YELLOW}Test 7: CRUD operations${NC}"

# List notes
notes_list_response=$(api_call "GET" "/api/notes" "" "$ACME_USER_TOKEN")
if echo "$notes_list_response" | grep -q '\['; then
    echo -e "${GREEN}✅ Notes listing works${NC}"
else
    echo -e "${RED}❌ Notes listing failed: $notes_list_response${NC}"
    exit 1
fi

# Get specific note
first_note_response=$(api_call "GET" "/api/notes/$acme_note_id" "" "$ACME_USER_TOKEN")
if echo "$first_note_response" | grep -q '"title"'; then
    echo -e "${GREEN}✅ Note retrieval works${NC}"
else
    echo -e "${RED}❌ Note retrieval failed: $first_note_response${NC}"
    exit 1
fi

# Update note
update_data='{"title":"Updated Note Title","content":"Updated content"}'
update_response=$(api_call "PUT" "/api/notes/$acme_note_id" "$update_data" "$ACME_USER_TOKEN")
if echo "$update_response" | grep -q '"title":"Updated Note Title"'; then
    echo -e "${GREEN}✅ Note update works${NC}"
else
    echo -e "${RED}❌ Note update failed: $update_response${NC}"
    exit 1
fi

# Delete note
delete_response=$(api_call "DELETE" "/api/notes/$acme_note_id" "" "$ACME_USER_TOKEN")
if echo "$delete_response" | grep -q '"message"'; then
    echo -e "${GREEN}✅ Note deletion works${NC}"
else
    echo -e "${RED}❌ Note deletion failed: $delete_response${NC}"
    exit 1
fi
echo ""

# Test 8: Frontend accessibility
echo -e "${YELLOW}Test 8: Frontend accessibility${NC}"

frontend_response=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$API_BASE_URL/")
if [ "$frontend_response" = "200" ]; then
    echo -e "${GREEN}✅ Frontend accessible${NC}"
else
    echo -e "${RED}❌ Frontend not accessible (HTTP $frontend_response)${NC}"
    exit 1
fi
echo ""

# Test 9: User info endpoint
echo -e "${YELLOW}Test 9: User info endpoint${NC}"

me_response=$(api_call "GET" "/api/me" "" "$ACME_ADMIN_TOKEN")
if echo "$me_response" | grep -q '"email":"admin@acme.test"'; then
    echo -e "${GREEN}✅ User info endpoint works${NC}"
else
    echo -e "${RED}❌ User info endpoint failed: $me_response${NC}"
    exit 1
fi
echo ""

echo -e "${GREEN}🎉 All tests passed successfully!${NC}"
echo -e "${YELLOW}📊 Test Summary:${NC}"
echo -e "  ✅ Health check"
echo -e "  ✅ Authentication (4 accounts)"
echo -e "  ✅ Cross-tenant isolation"
echo -e "  ✅ Role-based authorization"
echo -e "  ✅ Free plan note limits"
echo -e "  ✅ Tenant upgrade functionality"
echo -e "  ✅ CRUD operations"
echo -e "  ✅ Frontend accessibility"
echo -e "  ✅ User info endpoint"
echo ""
echo -e "${GREEN}🚀 SaaS Notes App is working correctly!${NC}"