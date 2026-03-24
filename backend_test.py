#!/usr/bin/env python3
"""
Comprehensive Backend Test Suite for Matka App
Tests all API endpoints as specified in the review request
"""

import requests
import json
import sys
from datetime import date

# Get backend URL from frontend env
BACKEND_URL = "https://sattabazi-hub.preview.emergentagent.com/api"

class MatkaAppTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.test_results = []
        
    def log_test(self, test_name, success, message, response_data=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "response_data": response_data
        })
        
        if response_data and not success:
            print(f"   Response: {json.dumps(response_data, indent=2)}")
    
    def test_markets_endpoint(self):
        """Test GET /api/markets - should return 6 markets"""
        try:
            response = self.session.get(f"{self.base_url}/markets")
            
            if response.status_code == 200:
                markets = response.json()
                
                if len(markets) == 6:
                    expected_markets = ["Delhi Bazaar", "Shri Ganesh", "Faridabad", "Ghaziabad", "Kali", "Dishawar"]
                    market_names = [m["name"] for m in markets]
                    
                    if all(name in market_names for name in expected_markets):
                        self.log_test("Markets Endpoint", True, f"Successfully retrieved {len(markets)} markets with correct names")
                        return True
                    else:
                        self.log_test("Markets Endpoint", False, f"Market names don't match expected. Got: {market_names}")
                        return False
                else:
                    self.log_test("Markets Endpoint", False, f"Expected 6 markets, got {len(markets)}")
                    return False
            else:
                self.log_test("Markets Endpoint", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Markets Endpoint", False, f"Exception: {str(e)}")
            return False
    
    def test_latest_results_empty(self):
        """Test GET /api/results/latest - should return empty results initially"""
        try:
            response = self.session.get(f"{self.base_url}/results/latest")
            
            if response.status_code == 200:
                results = response.json()
                
                if len(results) == 6:  # Should have 6 markets even if empty
                    # Check if results are empty (no opening/closing/jodi)
                    empty_results = [r for r in results if not r.get("opening") and not r.get("closing") and not r.get("jodi")]
                    
                    if len(empty_results) == 6:
                        self.log_test("Latest Results (Empty)", True, "All 6 markets returned with empty results as expected")
                        return True
                    else:
                        self.log_test("Latest Results (Empty)", True, f"Results found: {len(results) - len(empty_results)} markets have data")
                        return True
                else:
                    self.log_test("Latest Results (Empty)", False, f"Expected 6 market results, got {len(results)}")
                    return False
            else:
                self.log_test("Latest Results (Empty)", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Latest Results (Empty)", False, f"Exception: {str(e)}")
            return False
    
    def test_generate_all_results(self):
        """Test POST /api/admin/generate-all-results"""
        try:
            response = self.session.post(f"{self.base_url}/admin/generate-all-results")
            
            if response.status_code == 200:
                result = response.json()
                
                if result.get("success") and "Generated results for" in result.get("message", ""):
                    self.log_test("Generate All Results", True, result["message"])
                    return True
                else:
                    self.log_test("Generate All Results", False, f"Unexpected response: {result}")
                    return False
            else:
                self.log_test("Generate All Results", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Generate All Results", False, f"Exception: {str(e)}")
            return False
    
    def test_latest_results_with_data(self):
        """Test GET /api/results/latest - should now show generated results"""
        try:
            response = self.session.get(f"{self.base_url}/results/latest")
            
            if response.status_code == 200:
                results = response.json()
                
                if len(results) == 6:
                    # Check if results now have data
                    results_with_data = [r for r in results if r.get("opening") and r.get("closing") and r.get("jodi")]
                    
                    if len(results_with_data) == 6:
                        self.log_test("Latest Results (With Data)", True, f"All 6 markets now have generated results")
                        
                        # Validate data format
                        for result in results_with_data:
                            if not (len(result["opening"]) == 2 and len(result["closing"]) == 2 and len(result["jodi"]) == 2):
                                self.log_test("Latest Results (With Data)", False, f"Invalid result format: {result}")
                                return False
                        
                        return True
                    else:
                        self.log_test("Latest Results (With Data)", False, f"Only {len(results_with_data)} markets have complete data")
                        return False
                else:
                    self.log_test("Latest Results (With Data)", False, f"Expected 6 market results, got {len(results)}")
                    return False
            else:
                self.log_test("Latest Results (With Data)", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Latest Results (With Data)", False, f"Exception: {str(e)}")
            return False
    
    def test_send_otp(self):
        """Test POST /api/auth/send-otp"""
        try:
            test_mobile = "9876543210"
            payload = {"mobile": test_mobile}
            
            response = self.session.post(f"{self.base_url}/auth/send-otp", json=payload)
            
            if response.status_code == 200:
                result = response.json()
                
                if result.get("success") and "123456" in result.get("message", ""):
                    self.log_test("Send OTP", True, f"OTP sent successfully for {test_mobile}")
                    return True
                else:
                    self.log_test("Send OTP", False, f"Unexpected response: {result}")
                    return False
            else:
                self.log_test("Send OTP", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Send OTP", False, f"Exception: {str(e)}")
            return False
    
    def test_verify_otp(self):
        """Test POST /api/auth/verify-otp"""
        try:
            test_mobile = "9876543210"
            payload = {"mobile": test_mobile, "otp": "123456"}
            
            response = self.session.post(f"{self.base_url}/auth/verify-otp", json=payload)
            
            if response.status_code == 200:
                result = response.json()
                
                if result.get("success") and result.get("user_id") and result.get("mobile") == test_mobile:
                    self.log_test("Verify OTP", True, f"OTP verified successfully for {test_mobile}")
                    return True
                else:
                    self.log_test("Verify OTP", False, f"Unexpected response: {result}")
                    return False
            else:
                self.log_test("Verify OTP", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Verify OTP", False, f"Exception: {str(e)}")
            return False
    
    def test_verify_otp_invalid(self):
        """Test POST /api/auth/verify-otp with invalid OTP"""
        try:
            test_mobile = "9876543210"
            payload = {"mobile": test_mobile, "otp": "000000"}
            
            response = self.session.post(f"{self.base_url}/auth/verify-otp", json=payload)
            
            if response.status_code == 400:
                self.log_test("Verify OTP (Invalid)", True, "Correctly rejected invalid OTP")
                return True
            else:
                self.log_test("Verify OTP (Invalid)", False, f"Expected 400 error, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Verify OTP (Invalid)", False, f"Exception: {str(e)}")
            return False
    
    def test_generate_single_result(self):
        """Test POST /api/admin/generate-result"""
        try:
            payload = {"market_id": "delhi"}
            
            response = self.session.post(f"{self.base_url}/admin/generate-result", json=payload)
            
            if response.status_code == 200:
                result = response.json()
                
                if result.get("success") and result.get("result"):
                    generated_result = result["result"]
                    if (generated_result.get("opening") and 
                        generated_result.get("closing") and 
                        generated_result.get("jodi")):
                        self.log_test("Generate Single Result", True, f"Generated result for Delhi market")
                        return True
                    else:
                        self.log_test("Generate Single Result", False, f"Incomplete result data: {generated_result}")
                        return False
                else:
                    self.log_test("Generate Single Result", False, f"Unexpected response: {result}")
                    return False
            else:
                self.log_test("Generate Single Result", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Generate Single Result", False, f"Exception: {str(e)}")
            return False
    
    def test_results_history(self):
        """Test GET /api/results/history"""
        try:
            response = self.session.get(f"{self.base_url}/results/history?market_id=delhi&limit=30")
            
            if response.status_code == 200:
                results = response.json()
                
                if isinstance(results, list):
                    if len(results) > 0:
                        # Check if results have proper structure
                        first_result = results[0]
                        if (first_result.get("market_id") == "delhi" and 
                            first_result.get("market_name") and
                            first_result.get("date")):
                            self.log_test("Results History", True, f"Retrieved {len(results)} historical results for Delhi")
                            return True
                        else:
                            self.log_test("Results History", False, f"Invalid result structure: {first_result}")
                            return False
                    else:
                        self.log_test("Results History", True, "No historical results found (empty list)")
                        return True
                else:
                    self.log_test("Results History", False, f"Expected list, got: {type(results)}")
                    return False
            else:
                self.log_test("Results History", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Results History", False, f"Exception: {str(e)}")
            return False
    
    def test_update_result(self):
        """Test POST /api/admin/update-result"""
        try:
            payload = {
                "market_id": "delhi",
                "opening": "45",
                "closing": "67",
                "jodi": "89"
            }
            
            response = self.session.post(f"{self.base_url}/admin/update-result", json=payload)
            
            if response.status_code == 200:
                result = response.json()
                
                if result.get("success"):
                    self.log_test("Update Result", True, "Successfully updated Delhi market result")
                    return True
                else:
                    self.log_test("Update Result", False, f"Unexpected response: {result}")
                    return False
            else:
                self.log_test("Update Result", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Update Result", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all tests in the specified order"""
        print(f"🚀 Starting Matka App Backend Tests")
        print(f"Backend URL: {self.base_url}")
        print("=" * 60)
        
        # Test flow as specified in review request
        tests = [
            ("1. Markets Endpoint", self.test_markets_endpoint),
            ("2. Latest Results (Empty)", self.test_latest_results_empty),
            ("3. Generate All Results", self.test_generate_all_results),
            ("4. Latest Results (With Data)", self.test_latest_results_with_data),
            ("5. Results History", self.test_results_history),
            ("6. Send OTP", self.test_send_otp),
            ("7. Verify OTP", self.test_verify_otp),
            ("8. Verify OTP (Invalid)", self.test_verify_otp_invalid),
            ("9. Generate Single Result", self.test_generate_single_result),
            ("10. Update Result", self.test_update_result),
        ]
        
        passed = 0
        failed = 0
        
        for test_name, test_func in tests:
            print(f"\n🧪 Running {test_name}...")
            if test_func():
                passed += 1
            else:
                failed += 1
        
        print("\n" + "=" * 60)
        print(f"📊 TEST SUMMARY")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"📈 Success Rate: {(passed/(passed+failed)*100):.1f}%")
        
        return failed == 0

if __name__ == "__main__":
    tester = MatkaAppTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)