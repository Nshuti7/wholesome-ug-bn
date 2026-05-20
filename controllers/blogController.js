const Blog = require("../models/Blog");
const cloudinary = require("cloudinary").v2;
const { generateBlogContent } = require("../services/geminiService");

exports.generateContent = async (req, res) => {
  try {
    const { title, category, excerpt, readTime } = req.body;

    if (!title || !category || !excerpt) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const content = await generateBlogContent({
      title,
      category,
      excerpt,
      readTime,
    });
    res.status(200).json({ success: true, content });
  } catch (error) {
    console.error("Error generating content:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Failed to generate content" });
  }
};

// Other controllers remain the same:
exports.createBlog = async (req, res) => {
  try {
    const { title, date, category, excerpt, readTime, content } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "Image is required" });
    }

    // Since we're using CloudinaryStorage, the file is already uploaded to Cloudinary
    // and contains the URL and public_id in the file object
    let finalContent = content;
    if (!finalContent || finalContent.trim() === "") {
      finalContent = await generateBlogContent({
        title,
        category,
        excerpt,
        readTime,
      });
    }

    const blog = await Blog.create({
      title,
      date,
      category,
      excerpt,
      readTime,
      content: finalContent,
      image: req.file.path, // This is the Cloudinary URL
      cloudinaryId: req.file.filename, // This is the Cloudinary public_id
    });

    res.status(201).json({ success: true, data: blog });
  } catch (error) {
    console.error("Error creating blog:", error.message);
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getAllBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: blogs.length, data: blogs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res
        .status(404)
        .json({ success: false, message: "Blog not found" });
    }
    res.status(200).json({ success: true, data: blog });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res
        .status(404)
        .json({ success: false, message: "Blog not found" });
    }

    const { title, date, category, excerpt, readTime, content } = req.body;

    if (req.file) {
      if (blog.cloudinaryId) {
        await cloudinary.uploader.destroy(blog.cloudinaryId);
      }
      // Since we're using CloudinaryStorage, the file is already uploaded to Cloudinary
      blog.image = req.file.path; // This is the Cloudinary URL
      blog.cloudinaryId = req.file.filename; // This is the Cloudinary public_id
    }

    blog.title = title;
    blog.date = date;
    blog.category = category;
    blog.excerpt = excerpt;
    blog.readTime = readTime;
    blog.content = content;

    const updated = await blog.save();
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res
        .status(404)
        .json({ success: false, message: "Blog not found" });
    }

    if (blog.cloudinaryId) {
      await cloudinary.uploader.destroy(blog.cloudinaryId);
    }

    await blog.remove();
    res.json({ success: true, message: "Blog deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
