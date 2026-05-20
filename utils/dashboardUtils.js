const mongoose = require("mongoose");

// Format monthly statistics for charts
exports.formatMonthlyStats = (monthlyData) => {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return monthlyData.map(item => ({
    month: `${months[item._id.month - 1]} ${item._id.year}`,
    count: item.count,
    year: item._id.year,
    monthNumber: item._id.month
  }));
};

// Calculate growth percentage
exports.calculateGrowth = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};

// Get date range for analytics
exports.getDateRange = (days = 30) => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return { startDate, endDate };
};

// Format analytics data for charts
exports.formatChartData = (data, labelKey = 'name', valueKey = 'count') => {
  return data.map(item => ({
    label: item[labelKey] || item._id,
    value: item[valueKey] || item.count
  }));
};

// Get top performing content
exports.getTopContent = async (model, limit = 5, sortField = 'createdAt') => {
  return model.find()
    .sort({ [sortField]: -1 })
    .limit(limit)
    .select('title name createdAt');
};

// Calculate engagement metrics
exports.calculateEngagement = (reviews, contacts, subscribers) => {
  const totalInteractions = reviews + contacts + subscribers;
  const avgRating = reviews > 0 ? reviews / totalInteractions : 0;
  
  return {
    totalInteractions,
    avgRating: Math.round(avgRating * 100) / 100,
    engagementRate: totalInteractions > 0 ? Math.round((reviews / totalInteractions) * 100) : 0
  };
};

// Get dashboard summary cards data
exports.getSummaryCards = async () => {
  const { startDate } = exports.getDateRange(30);
  
  const [
    recentContacts,
    recentReviews,
    recentBlogs,
    recentDestinations,
    recentBookings
  ] = await Promise.all([
    mongoose.model('Contact').countDocuments({ createdAt: { $gte: startDate } }),
    mongoose.model('Review').countDocuments({ createdAt: { $gte: startDate } }),
    mongoose.model('Blog').countDocuments({ createdAt: { $gte: startDate } }),
    mongoose.model('Destination').countDocuments({ createdAt: { $gte: startDate } }),
    mongoose.model('Booking').countDocuments({ createdAt: { $gte: startDate } })
  ]);

  return {
    recentContacts,
    recentReviews,
    recentBlogs,
    recentDestinations,
    recentBookings
  };
};

// Format contact status for display
exports.formatContactStatus = (statusStats) => {
  const statusColors = {
    new: 'bg-blue-500',
    'in progress': 'bg-yellow-500',
    resolved: 'bg-green-500'
  };

  return statusStats.map(stat => ({
    status: stat._id,
    count: stat.count,
    color: statusColors[stat._id] || 'bg-gray-500'
  }));
};

// Get performance metrics
exports.getPerformanceMetrics = async () => {
  const { startDate } = exports.getDateRange(30);
  const { startDate: lastMonthStart } = exports.getDateRange(60);

  const [
    currentContacts,
    lastMonthContacts,
    currentReviews,
    lastMonthReviews,
    currentSubscribers,
    lastMonthSubscribers,
    currentBookings,
    lastMonthBookings
  ] = await Promise.all([
    mongoose.model('Contact').countDocuments({ createdAt: { $gte: startDate } }),
    mongoose.model('Contact').countDocuments({ 
      createdAt: { $gte: lastMonthStart, $lt: startDate } 
    }),
    mongoose.model('Review').countDocuments({ createdAt: { $gte: startDate } }),
    mongoose.model('Review').countDocuments({ 
      createdAt: { $gte: lastMonthStart, $lt: startDate } 
    }),
    mongoose.model('Newsletter').countDocuments({ 
      subscribed: true, 
      createdAt: { $gte: startDate } 
    }),
    mongoose.model('Newsletter').countDocuments({ 
      subscribed: true, 
      createdAt: { $gte: lastMonthStart, $lt: startDate } 
    }),
    mongoose.model('Booking').countDocuments({ createdAt: { $gte: startDate } }),
    mongoose.model('Booking').countDocuments({ 
      createdAt: { $gte: lastMonthStart, $lt: startDate } 
    })
  ]);

  return {
    contacts: {
      current: currentContacts,
      previous: lastMonthContacts,
      growth: exports.calculateGrowth(currentContacts, lastMonthContacts)
    },
    reviews: {
      current: currentReviews,
      previous: lastMonthReviews,
      growth: exports.calculateGrowth(currentReviews, lastMonthReviews)
    },
    subscribers: {
      current: currentSubscribers,
      previous: lastMonthSubscribers,
      growth: exports.calculateGrowth(currentSubscribers, lastMonthSubscribers)
    },
    bookings: {
      current: currentBookings,
      previous: lastMonthBookings,
      growth: exports.calculateGrowth(currentBookings, lastMonthBookings)
    }
  };
};

// Get content distribution
exports.getContentDistribution = async () => {
  const [blogs, destinations, itineraries, gallery, bookings] = await Promise.all([
    mongoose.model('Blog').countDocuments(),
    mongoose.model('Destination').countDocuments(),
    mongoose.model('Itinerary').countDocuments(),
    mongoose.model('Gallery').countDocuments(),
    mongoose.model('Booking').countDocuments()
  ]);

  const total = blogs + destinations + itineraries + gallery + bookings;

  return {
    blogs: { count: blogs, percentage: Math.round((blogs / total) * 100) },
    destinations: { count: destinations, percentage: Math.round((destinations / total) * 100) },
    itineraries: { count: itineraries, percentage: Math.round((itineraries / total) * 100) },
    gallery: { count: gallery, percentage: Math.round((gallery / total) * 100) },
    bookings: { count: bookings, percentage: Math.round((bookings / total) * 100) }
  };
};

// Format recent activities for timeline
exports.formatRecentActivities = (activities) => {
  return activities.map(activity => ({
    id: activity._id,
    type: activity.type,
    title: activity.title || activity.name,
    description: activity.description || activity.subject,
    timestamp: activity.createdAt,
    status: activity.status,
    icon: getActivityIcon(activity.type)
  }));
};

// Get activity icon based on type
function getActivityIcon(type) {
  const icons = {
    contact: 'message-circle',
    review: 'star',
    blog: 'file-text',
    destination: 'map-pin',
    itinerary: 'calendar',
    gallery: 'image',
    newsletter: 'mail'
  };
  
  return icons[type] || 'circle';
} 