const Folder = require('../models/Folder');
const Document = require('../models/Document');

// Create folder
exports.createFolder = async (req, res) => {
  try {
    const { name, parentFolderId } = req.body;
    
    const folder = new Folder({
      name,
      parentFolderId,
      createdBy: req.user.userId
    });

    await folder.save();
    await folder.populate('createdBy', 'name email');
    res.status(201).json(folder);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get folders by parent or root
exports.getFolders = async (req, res) => {
  try {
    const { parentFolderId } = req.query;
    const folders = await Folder.find({ 
      parentFolderId: parentFolderId || null, 
      deletedAt: null 
    })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(folders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get folder with contents
exports.getFolderContents = async (req, res) => {
  try {
    const { id } = req.params;
    const folder = await Folder.findOne({ _id: id, deletedAt: null })
      .populate('createdBy', 'name email');
    
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    const subfolders = await Folder.find({ parentFolderId: id, deletedAt: null });
    const documents = await Document.find({ folderId: id, deletedAt: null })
      .populate('uploadedBy', 'name email');

    res.json({ folder, subfolders, documents });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update folder
exports.updateFolder = async (req, res) => {
  try {
    const { name } = req.body;
    const folder = await Folder.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { name },
      { new: true }
    ).populate('createdBy', 'name email');

    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    res.json(folder);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete folder
exports.deleteFolder = async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Soft delete folder and all subfolders/documents
    await Folder.updateMany(
      { parentFolderId: folder._id },
      { deletedAt: new Date() }
    );
    await Document.updateMany(
      { folderId: folder._id },
      { deletedAt: new Date() }
    );
    
    folder.deletedAt = new Date();
    await folder.save();
    res.json({ message: 'Folder deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
