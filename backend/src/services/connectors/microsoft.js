const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

async function getCourses(){
    try {
        console.log("Fetching courses from Repo B...");
        const response = await axios.get(process.env.REPO_B_URL);
        return {
            modules: response.data.modules || [],
            learningPaths: response.data.learningPaths || []
        };
    } catch (error) {
        console.error("Connector Error:", error.response ? error.response.data : error.message);
        throw error;
    }
}

function normalize(data) {
    const all_items = [...(data.modules || []), ...(data.learningPaths || [])];
    if(all_items.length === 0) return [];
    return all_items.map(item => ({
        externalId: item.uid, 
        title: item.title,
        description: item.summary || "No description available",
        provider: 'Microsoft Learn',
        url: item.url,
        language: item.locale || 'en',
        level: (item.levels && item.levels.length > 0) ? item.levels[0] : 'Beginner',
        category: (item.roles && item.roles.length > 0) ? item.roles[0] : 'Technical',
        keywords: item.products || [],
        source: 'Repo B '
    }));

}

module.exports = {
    getCourses,
    normalize
};