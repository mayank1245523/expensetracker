require('dotenv').config();
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to categorize an expense based on title
async function categorizeExpense(title) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expense categorization assistant. Based on the expense title, suggest the most appropriate category. Common categories include: Food, Transport, Entertainment, Utilities, Healthcare, Shopping, Education, Travel, Housing, Insurance, Salary, Investment, Other. Respond with only the category name.'
        },
        {
          role: 'user',
          content: `Categorize this expense: "${title}"`
        }
      ],
      max_tokens: 10,
      temperature: 0.3,
    });
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error categorizing expense:', error);
    return 'Other';
  }
}

// Function to chat with expenses data
async function chatWithExpenses(query, expenses) {
  try {
    const expensesText = expenses.map(exp => 
      `${exp.title} - ${exp.category} - ₹${exp.amount} - ${exp.date.toDateString()}`
    ).join('\n');

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a helpful expense tracking assistant. The user has these expenses:\n${expensesText}\n\nAnswer questions about their spending in a friendly, concise way. If they ask for calculations, provide accurate numbers.`
        },
        {
          role: 'user',
          content: query
        }
      ],
      max_tokens: 200,
      temperature: 0.7,
    });
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error in chat:', error);
    return 'Sorry, I couldn\'t process your query right now.';
  }
}

// Function to generate AI insights
async function generateInsights(expenses) {
  try {
    const expensesText = expenses.map(exp => 
      `${exp.title} - ${exp.category} - ₹${exp.amount} - ${exp.date.toDateString()}`
    ).join('\n');

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a financial advisor. Based on the user's expenses, provide 3-4 personalized, actionable insights and suggestions for better money management. Be encouraging and specific. Here's the expense data:\n${expensesText}`
        },
        {
          role: 'user',
          content: 'Provide spending insights and suggestions.'
        }
      ],
      max_tokens: 300,
      temperature: 0.7,
    });
    const insights = response.choices[0].message.content.trim().split('\n').filter(line => line.trim());
    return insights;
  } catch (error) {
    console.error('Error generating insights:', error);
    return ['Unable to generate AI insights at the moment.'];
  }
}

module.exports = {
  categorizeExpense,
  chatWithExpenses,
  generateInsights
};