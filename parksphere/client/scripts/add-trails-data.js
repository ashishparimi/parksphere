const fs = require('fs');
const path = require('path');

// Sample trail data for each park
const trailsData = {
  yose: [
    {
      id: "yose-half-dome",
      name: "Half Dome Trail",
      difficulty: "expert",
      length: 14.2,
      elevationGain: 4800,
      estimatedTime: 10,
      coordinates: [
        { lat: 37.7459, lon: -119.5332 },
        { lat: 37.7469, lon: -119.5342 },
        { lat: 37.7479, lon: -119.5352 },
        { lat: 37.7489, lon: -119.5362 }
      ],
      highlights: ["Vernal Fall", "Nevada Fall", "Sub Dome", "Half Dome Cables"],
      description: "One of the most challenging and rewarding hikes in Yosemite, featuring cables for the final ascent."
    },
    {
      id: "yose-mirror-lake",
      name: "Mirror Lake Loop",
      difficulty: "easy",
      length: 2.4,
      elevationGain: 100,
      estimatedTime: 1.5,
      coordinates: [
        { lat: 37.7385, lon: -119.5593 },
        { lat: 37.7395, lon: -119.5603 },
        { lat: 37.7405, lon: -119.5593 },
        { lat: 37.7395, lon: -119.5583 }
      ],
      highlights: ["Mirror Lake", "Tenaya Creek", "Half Dome Views"],
      description: "A peaceful walk to Mirror Lake with stunning reflections of surrounding cliffs."
    },
    {
      id: "yose-mist-trail",
      name: "Mist Trail to Vernal Fall",
      difficulty: "moderate",
      length: 5.5,
      elevationGain: 1000,
      estimatedTime: 3,
      coordinates: [
        { lat: 37.7321, lon: -119.5577 },
        { lat: 37.7331, lon: -119.5587 },
        { lat: 37.7341, lon: -119.5597 },
        { lat: 37.7351, lon: -119.5607 }
      ],
      highlights: ["Vernal Fall", "Emerald Pool", "Rainbow Views"],
      description: "Experience the mist from Vernal Fall on this popular granite stairway trail."
    }
  ],
  grca: [
    {
      id: "grca-bright-angel",
      name: "Bright Angel Trail",
      difficulty: "hard",
      length: 9.5,
      elevationGain: 4380,
      estimatedTime: 8,
      coordinates: [
        { lat: 36.0578, lon: -112.1438 },
        { lat: 36.0568, lon: -112.1428 },
        { lat: 36.0558, lon: -112.1418 },
        { lat: 36.0548, lon: -112.1408 }
      ],
      highlights: ["Indian Garden", "Plateau Point", "Colorado River"],
      description: "The most popular trail into the canyon, with rest houses and water stations."
    },
    {
      id: "grca-rim-trail",
      name: "Rim Trail",
      difficulty: "easy",
      length: 13,
      elevationGain: 200,
      estimatedTime: 5,
      coordinates: [
        { lat: 36.0567, lon: -112.1367 },
        { lat: 36.0577, lon: -112.1377 },
        { lat: 36.0587, lon: -112.1387 },
        { lat: 36.0597, lon: -112.1397 }
      ],
      highlights: ["Multiple Viewpoints", "Sunset Views", "Historic Buildings"],
      description: "A mostly flat trail along the South Rim with spectacular canyon views."
    }
  ],
  yell: [
    {
      id: "yell-grand-prismatic",
      name: "Grand Prismatic Spring Trail",
      difficulty: "easy",
      length: 1.6,
      elevationGain: 105,
      estimatedTime: 1,
      coordinates: [
        { lat: 44.5251, lon: -110.8382 },
        { lat: 44.5261, lon: -110.8392 },
        { lat: 44.5271, lon: -110.8382 },
        { lat: 44.5261, lon: -110.8372 }
      ],
      highlights: ["Grand Prismatic Spring", "Excelsior Geyser", "Thermal Features"],
      description: "Boardwalk trail showcasing the largest hot spring in the United States."
    }
  ]
};

// Read existing parks data
const parksFilePath = path.join(__dirname, '../public/data/parks.json');
const parksData = JSON.parse(fs.readFileSync(parksFilePath, 'utf8'));

// Add trails to each park
parksData.parks = parksData.parks.map(park => {
  const trails = trailsData[park.code];
  if (trails) {
    return { ...park, trails };
  }
  return park;
});

// Write updated data
fs.writeFileSync(parksFilePath, JSON.stringify(parksData, null, 2));
console.log('✅ Trail data added to parks.json');