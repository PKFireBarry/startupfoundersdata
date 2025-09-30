import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/firebase/server';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

async function enrichPersonData(jobData: any) {
  console.log('Starting data enrichment...');
  const enrichedData = { ...jobData };

  try {
    // If they have a company URL, scrape it directly
    if (jobData.company_url) {
      console.log('Scraping company website:', jobData.company_url);
      try {
        const response = await fetch(`https://r.jina.ai/${jobData.company_url}`, {
          headers: {
            'Accept': 'text/plain'
          }
        });
        if (response.ok) {
          const companyContent = await response.text();
          enrichedData.companyInfo = companyContent.substring(0, 2000); // Limit to 2000 chars
          console.log('Company info scraped, length:', companyContent.length);
        }
      } catch (error) {
        console.log('Company scraping failed:', error);
      }
    }

    // If they have LinkedIn, do a Google search to get cached info
    if (jobData.linkedinurl) {
      console.log('Searching Google for LinkedIn profile:', jobData.linkedinurl);
      try {
        const searchQuery = encodeURIComponent(`site:linkedin.com/in ${jobData.name || ''} ${jobData.company || ''}`);
        const googleSearchUrl = `https://r.jina.ai/www.google.com/search?q=${searchQuery}`;

        const response = await fetch(googleSearchUrl, {
          headers: {
            'Accept': 'text/plain'
          }
        });
        if (response.ok) {
          const searchResults = await response.text();
          enrichedData.linkedinInfo = searchResults.substring(0, 1500); // Limit to 1500 chars
          console.log('LinkedIn search info scraped, length:', searchResults.length);
        }
      } catch (error) {
        console.log('LinkedIn search failed:', error);
      }
    }

  } catch (error) {
    console.error('Data enrichment failed:', error);
  }

  console.log('Data enrichment completed');
  return enrichedData;
}

export async function POST(request: NextRequest) {
  // Generate outreach API called

  try {
    const { jobData, outreachType, messageType, contactId, saveToDatabase = true } = await request.json();
    // Request data processed

    // Enrich the person's data with web scraping
    const enrichedJobData = await enrichPersonData(jobData);

    // Get user from Clerk auth
    console.log('Getting user from Clerk auth...');
    const { userId } = await auth();
    console.log('User ID from auth:', userId ? 'Found' : 'Not found');

    if (!userId) {
      console.log('ERROR: No user ID found - returning 401');
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Get user profile from Firebase
    // Fetching user profile from Firebase
    const userDocRef = doc(db, 'user_profiles', userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      // User document does not exist
      return NextResponse.json(
        { error: 'User profile not found. Please set up your profile first.' },
        { status: 404 }
      );
    }

    const userProfile = userDoc.data();
    // User profile found
    const userGoals = userProfile?.goals || '';

    if (!process.env.GEMINI_API_KEY) {
      console.log('Gemini API key not found in environment');
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    console.log('Gemini API key found, length:', process.env.GEMINI_API_KEY.length);

    // Determine if we have PDF or text resume
    const hasPdfResume = userProfile?.resumePdfBase64;
    const hasTextResume = userProfile?.resumeText;

    console.log('Resume check:', {
      hasPdfResume: !!hasPdfResume,
      hasTextResume: !!hasTextResume,
      pdfLength: hasPdfResume ? userProfile.resumePdfBase64.length : 0,
      textLength: hasTextResume ? userProfile.resumeText.length : 0
    });

    if (!hasPdfResume && !hasTextResume) {
      return NextResponse.json(
        { error: 'No resume found. Please upload a PDF or add resume text in your profile.' },
        { status: 400 }
      );
    }

    // Use gemini-2.5-flash which supports multimodal input
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Prepare content parts
    const contentParts = [];

    if (hasPdfResume) {
      // Add PDF as base64 for Gemini to read directly
      contentParts.push({
        inlineData: {
          mimeType: 'application/pdf',
          data: userProfile.resumePdfBase64
        }
      });
      console.log('Added PDF to content parts');
    }

    // Create different prompts based on outreach type
    let prompt = '';

    if (outreachType === 'job') {
      prompt = `
You are an expert at crafting high-converting cold outreach messages based on modern job market best practices. Your goal is to write a message that cuts through the noise and gets a response.

CRITICAL PRINCIPLES:
- Keep it under 200 words (less is more)
- Use plain, conversational language - no buzzwords, corporate speak, or AI-sounding phrases
- Be specific with examples and concrete results from the actual resume
- Have ONE clear, specific ask
- Show genuine interest based on what you know about them
- Sound completely human - use contractions, natural flow, casual but professional tone
- Format: Who you are → Why you're reaching out → Why they should care

TARGET DETAILS:
Person: ${enrichedJobData.name || 'Hiring team'}
Company: ${enrichedJobData.company || 'Unknown Company'}
Company Description: ${enrichedJobData.company_info || 'Not specified'}
Role: ${enrichedJobData.role || 'Not specified'}
What they're looking for: ${enrichedJobData.looking_for || 'Not specified'}
LinkedIn URL: ${enrichedJobData.linkedinurl || 'Not provided'}
Company URL: ${enrichedJobData.company_url || 'Not provided'}

ENRICHED CONTEXT ABOUT THEM:
${enrichedJobData.companyInfo ? 'COMPANY WEBSITE INFO:\n' + enrichedJobData.companyInfo + '\n' : ''}
${enrichedJobData.linkedinInfo ? 'LINKEDIN SEARCH RESULTS:\n' + enrichedJobData.linkedinInfo + '\n' : ''}

HOW TO REFERENCE THEM (use the enriched context):
${enrichedJobData.company_info ? '- Reference their company description: "' + enrichedJobData.company_info + '"' : ''}
${enrichedJobData.companyInfo ? '- Reference specific details from their company website/product' : ''}
${enrichedJobData.linkedinInfo ? '- Reference details from their LinkedIn profile/background' : ''}
${enrichedJobData.looking_for ? '- Specifically address what they\'re looking for: "' + enrichedJobData.looking_for + '"' : ''}
${enrichedJobData.role ? '- Reference their role: ' + enrichedJobData.role : ''}
${!enrichedJobData.company_info && !enrichedJobData.companyInfo && !enrichedJobData.linkedinInfo ? '- Use general but genuine language about their work/company' : ''}

USER'S BACKGROUND:
${hasPdfResume ? 'Please analyze the attached resume PDF to understand the user\'s background, skills, and experience. Focus on specific achievements with measurable results.' : hasTextResume ? userProfile.resumeText : 'No resume provided'}

USER'S GOALS:
${userGoals}

MESSAGE TYPE: ${messageType} (email or LinkedIn)

${messageType === 'email' ? `
Write a complete, ready-to-send cold email with NO placeholders, brackets, or comments.

EMAIL STRUCTURE:
1. OPENS with who you are (1 sentence max)
2. STATES why you're reaching out specifically to them/their company 
3. HIGHLIGHTS 1-2 most relevant achievements from the resume with specific results
4. MAKES one clear, specific ask (15-minute call, coffee chat, or specific next step)
5. SOUNDS completely human and conversational

Include a compelling subject line (6-8 words max).
` : `
Write a complete, ready-to-send LinkedIn DM with NO placeholders, brackets, or comments.

LINKEDIN MESSAGE STYLE:
- Much more casual and direct than email
- Keep under 100 words
- Get straight to the point
- Ask directly: "Do you have any open roles?" or similar
- Less about selling yourself, more about asking what's available
- Social media tone - like you're messaging a friend
- No formal greetings or signatures needed

STRUCTURE:
1. Quick intro (who you are in 5-7 words)
2. Direct question about opportunities
3. Brief mention of relevant experience
4. Simple ask for next step
`}

CRITICAL: Write the actual content. Do NOT use placeholders. If you don't have specific information, write around it naturally. The message must be ready to copy and send immediately.
`;
    } else if (outreachType === 'collaboration') {
      prompt = `
You are crafting a collaboration outreach message between founders/builders. This is about mutual value creation, not job seeking.

COLLABORATION PRINCIPLES:
- Lead with specific value you can provide
- Show you understand their current challenges/projects
- Propose concrete ways to work together
- Be peer-to-peer, not supplicant
- Under 200 words, plain language
- One clear next step

TARGET DETAILS:
Person: ${enrichedJobData.name || 'Team'}
Company: ${enrichedJobData.company || 'Unknown Company'}
Company Description: ${enrichedJobData.company_info || 'Not specified'}
What they're working on: ${enrichedJobData.looking_for || 'Not specified'}
LinkedIn URL: ${enrichedJobData.linkedinurl || 'Not provided'}
Company URL: ${enrichedJobData.company_url || 'Not provided'}

ENRICHED CONTEXT ABOUT THEM:
${enrichedJobData.companyInfo ? 'COMPANY WEBSITE INFO:\n' + enrichedJobData.companyInfo + '\n' : ''}
${enrichedJobData.linkedinInfo ? 'LINKEDIN SEARCH RESULTS:\n' + enrichedJobData.linkedinInfo + '\n' : ''}

HOW TO REFERENCE THEM (use the enriched context):
${enrichedJobData.company_info ? '- Reference their company description for collaboration fit: "' + enrichedJobData.company_info + '"' : ''}
${enrichedJobData.companyInfo ? '- Reference specific details from their company/product for collaboration opportunities' : ''}
${enrichedJobData.linkedinInfo ? '- Reference their background/experience from LinkedIn for collaboration fit' : ''}
${enrichedJobData.looking_for ? '- Specifically address what they\'re working on: "' + enrichedJobData.looking_for + '"' : ''}
${!enrichedJobData.company_info && !enrichedJobData.companyInfo && !enrichedJobData.linkedinInfo ? '- Use general but genuine language about their work/company' : ''}

USER'S BACKGROUND:
${hasPdfResume ? 'Please analyze the attached resume PDF to understand their technical skills, projects, and expertise that could be valuable for collaboration.' : hasTextResume ? userProfile.resumeText : 'No resume provided'}

USER'S GOALS:
${userGoals}

MESSAGE TYPE: ${messageType} (email or LinkedIn)

${messageType === 'email' ? `
Write a complete, ready-to-send collaboration email with NO placeholders, brackets, or comments.

EMAIL STRUCTURE:
1. OPENS with a specific observation about their work/company
2. INTRODUCES yourself with relevant credibility (1-2 sentences max)
3. PROPOSES specific value you can provide based on your actual skills/experience
4. SUGGESTS concrete collaboration ideas
5. ASKS for one specific next step

Subject line should hint at the collaboration opportunity.
` : `
Write a complete, ready-to-send LinkedIn DM with NO placeholders, brackets, or comments.

LINKEDIN COLLABORATION STYLE:
- Casual, founder-to-founder tone
- Talk openly about what you're both working on
- Focus on alignment and mutual benefit
- Keep under 100 words
- Direct and conversational
- "Hey, I'm working on X, saw you're doing Y, think there might be some overlap"

STRUCTURE:
1. Quick intro about what you're working on
2. Mention what you saw about their work
3. Point out potential alignment/collaboration
4. Simple ask to chat more
`}

CRITICAL: Write the actual content with NO placeholders. Tone should be confident peer-to-peer. The message must be ready to copy and send immediately.
`;
    } else if (outreachType === 'friendship') {
      prompt = `
You are crafting a genuine networking message focused on building authentic professional relationships. This is about human connection and mutual learning, not immediate asks.

NETWORKING PRINCIPLES:
- Lead with genuine curiosity about their work
- Find authentic connection points (shared experiences, interests)
- Offer value or insights, don't just take
- Be conversational but professional
- No immediate asks for jobs/favors
- Focus on learning and relationship building

TARGET DETAILS:
Person: ${enrichedJobData.name || 'Professional'}
Company: ${enrichedJobData.company || 'Unknown Company'}
Company Description: ${enrichedJobData.company_info || 'Not specified'}
Their focus: ${enrichedJobData.looking_for || 'Not specified'}
LinkedIn URL: ${enrichedJobData.linkedinurl || 'Not provided'}
Company URL: ${enrichedJobData.company_url || 'Not provided'}

ENRICHED CONTEXT ABOUT THEM:
${enrichedJobData.companyInfo ? 'COMPANY WEBSITE INFO:\n' + enrichedJobData.companyInfo + '\n' : ''}
${enrichedJobData.linkedinInfo ? 'LINKEDIN SEARCH RESULTS:\n' + enrichedJobData.linkedinInfo + '\n' : ''}

HOW TO REFERENCE THEM (use the enriched context):
${enrichedJobData.company_info ? '- Reference their company description to show understanding: "' + enrichedJobData.company_info + '"' : ''}
${enrichedJobData.companyInfo ? '- Reference interesting aspects of their company/work for networking connection' : ''}
${enrichedJobData.linkedinInfo ? '- Reference shared interests or background from their LinkedIn' : ''}
${enrichedJobData.looking_for ? '- Show interest in what they\'re focused on: "' + enrichedJobData.looking_for + '"' : ''}
${!enrichedJobData.company_info && !enrichedJobData.companyInfo && !enrichedJobData.linkedinInfo ? '- Use general but genuine language about their work/company' : ''}

USER'S BACKGROUND:
${hasPdfResume ? 'Please analyze the attached resume PDF to find genuine connection points - shared technologies, similar career paths, complementary experiences.' : hasTextResume ? userProfile.resumeText : 'No resume provided'}

USER'S GOALS:
${userGoals}

MESSAGE TYPE: ${messageType} (email or LinkedIn)

${messageType === 'email' ? `
Write a complete, ready-to-send networking email with NO placeholders, brackets, or comments.

EMAIL STRUCTURE:
1. OPENS with specific interest in their work/company (not generic praise)
2. SHARES a genuine connection point from your actual background
3. OFFERS something of value based on your real experience
4. EXPRESSES curiosity about their experience/perspective
5. SUGGESTS low-pressure connection (coffee chat, informal call)
6. SOUNDS genuinely interested in them as a person

Subject line should be warm and specific to them.
` : `
Write a complete, ready-to-send LinkedIn DM with NO placeholders, brackets, or comments.

LINKEDIN NETWORKING STYLE:
- Super casual and friendly
- Like adding a friend on social media
- Focus on staying connected and seeing each other's posts
- Keep under 80 words
- "Hey, I see you're also working on AI stuff. I'm really into AI too. Would be cool to stay connected!"
- Natural, conversational tone
- About mutual following and engagement

STRUCTURE:
1. Quick observation about shared interest/background
2. Mention your similar interest
3. Suggest staying connected to see each other's content
4. Keep it light and social
`}

CRITICAL: Write the actual content with NO placeholders. Use natural, conversational language. Tone should be curious and authentic like you're connecting with someone on social media.
`;
    }

    // Add the prompt to content parts
    contentParts.push(prompt);

    // About to call Gemini API

    try {
      // Making Gemini API call
      const result = await model.generateContent(contentParts);
      // Gemini API call completed, getting response
      const response = await result.response;
      // Got response, extracting text
      const text = response.text();

      // Gemini API response received

      // Save the outreach record to database only if requested
      if (saveToDatabase) {
        try {
          const outreachRecord = {
            ownerUserId: userId,
            contactId: contactId || null,
            founderName: enrichedJobData.name || '',
            company: enrichedJobData.company || '',
            linkedinUrl: enrichedJobData.linkedinurl || '',
            email: enrichedJobData.email || '',
            messageType,
            outreachType,
            generatedMessage: text,
            stage: messageType === 'email' ? 'sent' : 'sent', // Default first stage for both types
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            last_interaction_date: serverTimestamp(), // Track when the outreach was created
          };

          const outreachRecordsRef = collection(db, 'outreach_records');
          const docRef = await addDoc(outreachRecordsRef, outreachRecord);
          // Outreach record saved

          return NextResponse.json({
            message: text,
            outreachRecordId: docRef.id
          });
        } catch (saveError) {
          console.error('Failed to save outreach record:', saveError);
          // Still return the message even if saving fails
          return NextResponse.json({
            message: text,
            warning: 'Message generated but not saved to history'
          });
        }
      } else {
        // Just return the message without saving
        return NextResponse.json({
          message: text
        });
      }
    } catch (geminiError) {
      console.error('Gemini API error details:', geminiError);
      console.error('Error message:', geminiError instanceof Error ? geminiError.message : 'Unknown error');
      console.error('Error stack:', geminiError instanceof Error ? geminiError.stack : 'No stack');
      throw geminiError;
    }
  } catch (error) {
    console.error('Error generating outreach:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      {
        error: 'Failed to generate outreach message',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
