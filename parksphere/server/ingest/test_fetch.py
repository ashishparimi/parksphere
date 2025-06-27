#!/usr/bin/env python3
"""Test version of fetch script without rate limiting"""

import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

import requests

# Test Unsplash API
UNSPLASH_ACCESS_KEY = os.getenv("UNSPLASH_ACCESS_KEY")

headers = {
    "Authorization": f"Client-ID {UNSPLASH_ACCESS_KEY}"
}

params = {
    "query": "Grand Canyon National Park landscape",
    "per_page": 1,
    "orientation": "landscape"
}

print("Testing Unsplash API...")
response = requests.get(
    "https://api.unsplash.com/search/photos",
    headers=headers,
    params=params
)

print(f"Status: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    print(f"Found {data['total']} photos")
    if data['results']:
        photo = data['results'][0]
        print(f"Photo URL: {photo['urls']['regular']}")
        print(f"Attribution: Photo by {photo['user']['name']} on Unsplash")
else:
    print(f"Error: {response.text}")