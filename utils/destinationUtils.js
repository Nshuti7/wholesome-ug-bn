const Itinerary = require("../models/Itinerary");

// Find itineraries that mention a specific destination
exports.findItinerariesForDestination = async (destinationName, options = {}) => {
  const { includeDebug = false, limit = 10 } = options;

  try {
    // Create a case-insensitive regex pattern
    const regexPattern = new RegExp(destinationName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const itineraries = await Itinerary.find({
      $or: [
        // Exact match in destinations array
        { "destinations.name": { $regex: new RegExp(`^${destinationName}$`, 'i') } },
        // Partial match in destinations array
        { "destinations.name": regexPattern },
        // Match in title
        { title: regexPattern },
        // Match in description
        { description: regexPattern },
        // Match in highlights
        { highlights: regexPattern }
      ]
    })
    .sort({ createdAt: -1 })
    .select("title daysCount nightsCount description highlights destinations backgroundImage additionalImages inclusions")
    .limit(limit)
    .lean();

    if (includeDebug) {
      // Get all itineraries for comparison
      const allItineraries = await Itinerary.find()
        .select("title destinations")
        .lean();

      const allDestinationNames = allItineraries
        .flatMap(it => it.destinations)
        .map(d => d.name);

      return {
        itineraries,
        debug: {
          destinationName,
          totalItineraries: allItineraries.length,
          matchingItineraries: itineraries.length,
          allDestinationNames: [...new Set(allDestinationNames)], // Remove duplicates
          regexPattern: regexPattern.toString()
        }
      };
    }

    return { itineraries };
  } catch (error) {
    console.error("Error finding itineraries for destination:", error);
    throw error;
  }
};

// Get all unique destination names from itineraries
exports.getAllItineraryDestinations = async () => {
  try {
    const itineraries = await Itinerary.find()
      .select("destinations")
      .lean();

    const destinationNames = itineraries
      .flatMap(it => it.destinations)
      .map(d => d.name);

    return [...new Set(destinationNames)]; // Remove duplicates
  } catch (error) {
    console.error("Error getting all itinerary destinations:", error);
    throw error;
  }
};

// Check if a destination name exists in any itinerary
exports.destinationExistsInItineraries = async (destinationName) => {
  try {
    const regexPattern = new RegExp(destinationName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    
    const count = await Itinerary.countDocuments({
      "destinations.name": regexPattern
    });

    return count > 0;
  } catch (error) {
    console.error("Error checking destination existence:", error);
    throw error;
  }
};

// Get destination statistics
exports.getDestinationStats = async () => {
  try {
    const itineraries = await Itinerary.find()
      .select("destinations")
      .lean();

    const destinationCounts = {};
    
    itineraries.forEach(itinerary => {
      itinerary.destinations.forEach(dest => {
        destinationCounts[dest.name] = (destinationCounts[dest.name] || 0) + 1;
      });
    });

    const sortedDestinations = Object.entries(destinationCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([name, count]) => ({ name, count }));

    return {
      totalUniqueDestinations: sortedDestinations.length,
      totalItineraries: itineraries.length,
      mostPopularDestinations: sortedDestinations.slice(0, 10),
      destinationCounts
    };
  } catch (error) {
    console.error("Error getting destination stats:", error);
    throw error;
  }
};

// Suggest similar destination names
exports.suggestSimilarDestinations = async (destinationName, limit = 5) => {
  try {
    const allDestinations = await exports.getAllItineraryDestinations();
    
    // Simple similarity check (can be improved with more sophisticated algorithms)
    const suggestions = allDestinations
      .filter(dest => 
        dest.toLowerCase().includes(destinationName.toLowerCase()) ||
        destinationName.toLowerCase().includes(dest.toLowerCase())
      )
      .slice(0, limit);

    return suggestions;
  } catch (error) {
    console.error("Error suggesting similar destinations:", error);
    throw error;
  }
}; 