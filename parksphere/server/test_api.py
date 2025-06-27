import requests
import json

BASE_URL = "http://localhost:8000"

def test_endpoints():
    print("Testing ParkSphere API endpoints...\n")
    
    # Test root endpoint
    print("1. Testing root endpoint:")
    response = requests.get(f"{BASE_URL}/")
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}\n")
    
    # Test health endpoint
    print("2. Testing health endpoint:")
    response = requests.get(f"{BASE_URL}/api/health")
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}\n")
    
    # Test get all parks
    print("3. Testing get all parks:")
    response = requests.get(f"{BASE_URL}/api/parks")
    print(f"   Status: {response.status_code}")
    print(f"   Number of parks: {len(response.json())}\n")
    
    # Test get single park
    print("4. Testing get single park (ID: 1):")
    response = requests.get(f"{BASE_URL}/api/parks/1")
    park = response.json()
    print(f"   Status: {response.status_code}")
    print(f"   Park name: {park['name']}")
    print(f"   Gallery images: {len(park['gallery'])}\n")
    
    # Test filter by biome
    print("5. Testing filter by biome (desert):")
    response = requests.get(f"{BASE_URL}/api/parks/biome/desert")
    parks = response.json()
    print(f"   Status: {response.status_code}")
    print(f"   Number of desert parks: {len(parks)}")
    print(f"   Parks: {[p['name'] for p in parks]}\n")

if __name__ == "__main__":
    test_endpoints()