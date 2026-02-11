const Course = require('../models/Courses');
const { spawn } = require('child_process');

const getStats = async (req, res) => {
    try {
        const courses = await Course.find({});
        const totalCourses = courses.length;

        if (totalCourses === 0) {
            return res.json({
                totalCourses: 0,
                bySource: [],
                byLanguage: [],
                byLevel: [],
                byCategory: [],
                uniqueSources: 0,
                uniqueCategories: 0,
                uniqueLanguages: 0,
                topCategory: null,
                topSource: null,
                coursesWithDescription: 0,
                descriptionPercentage: 0,
                lastSync: new Date().toISOString()
            });
        }

        // Υπολογισμός στατιστικών ανά πηγή
        const providerCount = {};
        courses.forEach(course => {
            const provider = course.provider || course.source || 'Άγνωστη';
            providerCount[provider] = (providerCount[provider] || 0) + 1;
        });
        
        const bySource = Object.entries(providerCount).map(([name, count]) => ({
            name,
            count,
            percentage: Math.round((count / totalCourses) * 100)
        })).sort((a, b) => b.count - a.count);

        // Υπολογισμός στατιστικών ανά γλώσσα
        const languageCount = {};
        const languageMap = {
            'en': 'Αγγλικά',
            'gr': 'Ελληνικά',
            'el': 'Ελληνικά',
            'sp': 'Ισπανικά',
            'es': 'Ισπανικά',
            'fr': 'Γαλλικά',
            'it': 'Ιταλικά'
        };
        
        courses.forEach(course => {
            const lang = course.language || 'en';
            const langName = languageMap[lang.toLowerCase()] || lang.toUpperCase();
            languageCount[langName] = (languageCount[langName] || 0) + 1;
        });

        const byLanguage = Object.entries(languageCount).map(([name, count]) => ({
            name,
            count,
            percentage: Math.round((count / totalCourses) * 100)
        })).sort((a, b) => b.count - a.count);

        // Υπολογισμός στατιστικών ανά επίπεδο
        const levelCount = {};
        courses.forEach(course => {
            const level = course.level || 'Beginner';
            levelCount[level] = (levelCount[level] || 0) + 1;
        });

        const byLevel = Object.entries(levelCount).map(([name, count]) => ({
            name,
            count,
            percentage: Math.round((count / totalCourses) * 100)
        })).sort((a, b) => b.count - a.count);

        // Υπολογισμός στατιστικών ανά κατηγορία
        const categoryCount = {};
        courses.forEach(course => {
            const category = course.category || 'General';
            categoryCount[category] = (categoryCount[category] || 0) + 1;
        });

        const byCategory = Object.entries(categoryCount).map(([name, count]) => ({
            name,
            count,
            percentage: Math.round((count / totalCourses) * 100)
        })).sort((a, b) => b.count - a.count);

        // Επιπλέον στατιστικά
        const uniqueSources = new Set(courses.map(c => c.source || c.provider).filter(Boolean)).size;
        const uniqueCategories = new Set(courses.map(c => c.category).filter(Boolean)).size;
        const uniqueLanguages = new Set(courses.map(c => c.language).filter(Boolean)).size;
        
        const topCategory = byCategory.length > 0 ? byCategory[0] : null;
        const topSource = bySource.length > 0 ? bySource[0] : null;

        const coursesWithDescription = courses.filter(c => c.description && c.description.trim().length > 0).length;
        const descriptionPercentage = Math.round((coursesWithDescription / totalCourses) * 100);

        res.json({
            totalCourses,
            bySource,
            byLanguage,
            byLevel,
            byCategory,
            uniqueSources,
            uniqueCategories,
            uniqueLanguages,
            topCategory,
            topSource,
            coursesWithDescription,
            descriptionPercentage,
            lastSync: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error calculating analytics:', error);
        res.status(500).json({ error: 'Failed to calculate analytics' });
    }
};


const runSparkJob = async (req, res) => {
    // 1. Χρήση Forward Slashes (/) - Η Node τα μετατρέπει αυτόματα σε Windows format
    // και είναι πιο ασφαλή για να μη μπερδεύονται τα escapes.
    const scriptPath = "C:/Users/ch1n1/uni_projects/apokentromena/.github/Spark_Aggregator/spark-layer/jobs/recommender.py";

    console.log(`🚀 Attempting to run: ${scriptPath}`);

    // 2. Δοκιμάζουμε την εντολή 'python'. Αν δεν δουλεύει, δοκίμασε 'py' ή 'python3'
    const pythonProcess = spawn('python', [scriptPath], {
        shell: true // Απαραίτητο για Windows για να βρει το PATH
    });

    let output = "";
    let errorOutput = "";

    pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
        console.error("Spark Log:", data.toString());
    });

    // 3. Βάζουμε ένα Timeout. Αν μετά από 2 λεπτά δεν απαντήσει, κλείσε το.
    const timeout = setTimeout(() => {
        pythonProcess.kill();
        if (!res.headersSent) {
            res.status(408).json({ message: "Spark Job Timeout - Το script αργεί πολύ" });
        }
    }, 120000);

    pythonProcess.on('close', (code) => {
        clearTimeout(timeout);
        if (code !== 0) {
            console.error(`Process exited with code ${code}`);
            if (!res.headersSent) {
                return res.status(500).json({ message: "Spark Error", error: errorOutput });
            }
        }
        if (!res.headersSent) {
            res.status(200).json({ message: "Success", details: output });
        }
    });
};

module.exports = {
    getStats,
    runSparkJob
};
