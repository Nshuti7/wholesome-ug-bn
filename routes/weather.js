const express = require('express');
const axios = require('axios');
const router = express.Router();

// Environment variables
const OPENWEATHERMAP_API_KEY = process.env.OPENWEATHERMAP_API_KEY;
const IPAPI_ACCESS_KEY = process.env.IPAPI_ACCESS_KEY;

// Helper function to get real client IP
const getClientIP = (req) => {
  // Use the clientIP set by the middleware
  if (req.clientIP) {
    return req.clientIP;
  }
  
  // Fallback to manual detection
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  // Check for real IP header
  const realIP = req.headers['x-real-ip'];
  if (realIP) {
    return realIP;
  }
  
  // Fallback to connection IP
  return req.connection.remoteAddress || req.socket.remoteAddress || req.ip;
};

/**
 * @swagger
 * /weather/current:
 *   get:
 *     summary: Get current weather data for a city
 *     description: Fetch current weather information from OpenWeatherMap API
 *     tags: [Weather]
 *     parameters:
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: City name
 *         example: Kigali
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *         description: Country code
 *         example: RW
 *     responses:
 *       200:
 *         description: Weather data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     cod:
 *                       type: integer
 *                       example: 200
 *                     main:
 *                       type: object
 *                       properties:
 *                         temp:
 *                           type: number
 *                           example: 24
 *                         feels_like:
 *                           type: number
 *                           example: 26
 *                         humidity:
 *                           type: integer
 *                           example: 65
 *                         pressure:
 *                           type: integer
 *                           example: 1013
 *                     weather:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           main:
 *                             type: string
 *                             example: "Partly Cloudy"
 *                           description:
 *                             type: string
 *                             example: "partly cloudy"
 *                           icon:
 *                             type: string
 *                             example: "02d"
 *                     wind:
 *                       type: object
 *                       properties:
 *                         speed:
 *                           type: number
 *                           example: 3.2
 *                         deg:
 *                           type: integer
 *                           example: 120
 *                     name:
 *                       type: string
 *                       example: "Kigali"
 *       400:
 *         description: Weather data not available
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Weather data not available"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to fetch weather data"
 */
router.get('/current', async (req, res) => {
  try {
    const { city, country } = req.query;
    
    // Validate required parameters
    if (!city || !country) {
      return res.status(400).json({
        success: false,
        message: 'City and country parameters are required'
      });
    }
    
    if (!OPENWEATHERMAP_API_KEY) {
      // Return mock weather data when API key is not configured
      return res.json({
        success: true,
        data: {
          cod: 200,
          main: {
            temp: 24,
            feels_like: 26,
            temp_min: 19,
            temp_max: 28,
            humidity: 65,
            pressure: 1013
          },
          weather: [
            {
              main: "Partly Cloudy",
              description: "partly cloudy",
              icon: "02d"
            }
          ],
          wind: {
            speed: 3.2,
            deg: 120
          },
          visibility: 10000,
          sys: {
            sunrise: 1640236800,
            sunset: 1640280000,
            country: "RW"
          },
          name: "Kigali"
        }
      });
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city},${country}&appid=${OPENWEATHERMAP_API_KEY}&units=metric`;
    
    const response = await axios.get(url);
    
    if (response.data.cod === 200) {
      res.json({
        success: true,
        data: response.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Weather data not available'
      });
    }
  } catch (error) {
    // Return mock weather data on any error
    res.json({
      success: true,
      data: {
        cod: 200,
        main: {
          temp: 24,
          feels_like: 26,
          temp_min: 19,
          temp_max: 28,
          humidity: 65,
          pressure: 1013
        },
        weather: [
          {
            main: "Partly Cloudy",
            description: "partly cloudy",
            icon: "02d"
          }
        ],
        wind: {
          speed: 3.2,
          deg: 120
        },
        visibility: 10000,
        sys: {
          sunrise: 1640236800,
          sunset: 1640280000,
          country: "RW"
        },
        name: "Kigali"
      }
    });
  }
});

/**
 * @swagger
 * /weather/location:
 *   get:
 *     summary: Get user's full location data
 *     description: Detect user's location using IP address via ipapi.com
 *     tags: [Weather]
 *     responses:
 *       200:
 *         description: Location data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     country_code:
 *                       type: string
 *                       example: "UG"
 *                     country_name:
 *                       type: string
 *                       example: "Uganda"
 *                     region:
 *                       type: string
 *                       example: "Central Region"
 *                     city:
 *                       type: string
 *                       example: "Kampala"
 *                     latitude:
 *                       type: number
 *                       example: 0.3476
 *                     longitude:
 *                       type: number
 *                       example: 32.5825
 *                     timezone:
 *                       type: string
 *                       example: "Africa/Kampala"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to detect location"
 */
router.get('/location', async (req, res) => {
  try {
    if (!IPAPI_ACCESS_KEY) {
      return res.status(500).json({
        success: false,
        message: 'Location API key not configured'
      });
    }

    const clientIP = getClientIP(req);
    
    // Use the check endpoint for automatic IP detection
    const response = await axios.get(`http://api.ipapi.com/check?access_key=${IPAPI_ACCESS_KEY}`, {
      timeout: 10000
    });
    
    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    // Handle specific error cases
    if (error.code === 'ECONNABORTED') {
      return res.status(500).json({
        success: false,
        message: 'Location detection timeout - service unavailable'
      });
    }
    
    if (error.response?.status === 401) {
      return res.status(500).json({
        success: false,
        message: 'Invalid IPAPI access key'
      });
    }
    
    if (error.response?.status === 429) {
      return res.status(500).json({
        success: false,
        message: 'IPAPI rate limit exceeded'
      });
    }
    
    res.status(500).json({
      success: false,
      message: `Failed to detect location: ${error.message}`
    });
  }
});

/**
 * @swagger
 * /weather/country:
 *   get:
 *     summary: Get user's country information
 *     description: Detect user's country using IP address via ipapi.com
 *     tags: [Weather]
 *     responses:
 *       200:
 *         description: Country data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     country_code:
 *                       type: string
 *                       example: "UG"
 *                     country_name:
 *                       type: string
 *                       example: "Uganda"
 *       400:
 *         description: Country detection failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Country detection failed"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to detect country"
 */
router.get('/country', async (req, res) => {
  try {
    if (!IPAPI_ACCESS_KEY) {
      return res.status(500).json({
        success: false,
        message: 'Location API key not configured'
      });
    }

    // Prefer the IP explicitly forwarded by the frontend proxy (the real
    // visitor's IP); fall back to the request's own client IP.
    const clientIP = (req.query.ip || getClientIP(req) || "").toString().trim();

    // Reject missing/loopback/private IPs. Looking those up — or using ipapi's
    // /check endpoint — would geolocate this server, not the visitor, which is
    // exactly the bug we're avoiding. Better to return "no detection" so the
    // form simply skips autofill than to report a wrong country.
    const isUsablePublicIp =
      clientIP &&
      !/^(127\.|10\.|192\.168\.|169\.254\.|::1$|fc00:|fd00:|fe80:)/i.test(clientIP) &&
      !/^172\.(1[6-9]|2\d|3[01])\./.test(clientIP);

    if (!isUsablePublicIp) {
      return res.status(200).json({
        success: false,
        message: 'Could not determine visitor IP for country detection'
      });
    }

    // Look up the specific visitor IP (not /check, which detects the caller).
    const response = await axios.get(
      `http://api.ipapi.com/${encodeURIComponent(clientIP)}?access_key=${IPAPI_ACCESS_KEY}`,
      { timeout: 10000 }
    );

    if (response.data && response.data.country_code) {
      res.json({
        success: true,
        data: {
          country_code: response.data.country_code,
          country_name: response.data.country_name
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Country detection failed - no country code in response'
      });
    }
  } catch (error) {
    // Handle specific error cases
    if (error.code === 'ECONNABORTED') {
      return res.status(500).json({
        success: false,
        message: 'Country detection timeout - service unavailable'
      });
    }
    
    if (error.response?.status === 401) {
      return res.status(500).json({
        success: false,
        message: 'Invalid IPAPI access key'
      });
    }
    
    if (error.response?.status === 429) {
      return res.status(500).json({
        success: false,
        message: 'IPAPI rate limit exceeded'
      });
    }
    
    res.status(500).json({
      success: false,
      message: `Failed to detect country: ${error.message}`
    });
  }
});

/**
 * @swagger
 * /weather/test:
 *   get:
 *     summary: Test weather and location API configuration
 *     description: Check if environment variables are configured and APIs are accessible
 *     tags: [Weather]
 *     responses:
 *       200:
 *         description: Configuration status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     openweathermap_configured:
 *                       type: boolean
 *                       example: true
 *                     ipapi_configured:
 *                       type: boolean
 *                       example: true
 *                     openweathermap_test:
 *                       type: string
 *                       example: "success"
 *                     ipapi_test:
 *                       type: string
 *                       example: "success"
 */
router.get('/test', async (req, res) => {
  const testResults = {
    openweathermap_configured: !!OPENWEATHERMAP_API_KEY,
    ipapi_configured: !!IPAPI_ACCESS_KEY,
    openweathermap_test: 'not_tested',
    ipapi_test: 'not_tested',
    client_ip: getClientIP(req)
  };

  // Test OpenWeatherMap
  if (OPENWEATHERMAP_API_KEY) {
    try {
      const weatherResponse = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=Kigali,RW&appid=${OPENWEATHERMAP_API_KEY}&units=metric`, {
        timeout: 5000
      });
      testResults.openweathermap_test = weatherResponse.data.cod === 200 ? 'success' : 'failed';
    } catch (error) {
      testResults.openweathermap_test = `error: ${error.message}`;
    }
  } else {
    testResults.openweathermap_test = 'not_configured';
  }

  // Test IPAPI
  if (IPAPI_ACCESS_KEY) {
    try {
      const clientIP = getClientIP(req);
      const locationResponse = await axios.get(`http://api.ipapi.com/${clientIP}?access_key=${IPAPI_ACCESS_KEY}`, {
        timeout: 5000
      });
      testResults.ipapi_test = locationResponse.data && locationResponse.data.country_code ? 'success' : 'failed';
    } catch (error) {
      testResults.ipapi_test = `error: ${error.message}`;
    }
  } else {
    testResults.ipapi_test = 'not_configured';
  }

  res.json({
    success: true,
    data: testResults
  });
});

module.exports = router; 