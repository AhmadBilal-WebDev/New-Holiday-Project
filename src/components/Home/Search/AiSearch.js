'use client'
import React, { useState, useEffect } from 'react';
import { FiSend } from 'react-icons/fi';
import { BiMicrophone } from 'react-icons/bi';
import { RiRobot2Line } from 'react-icons/ri';
import { LuSparkle } from 'react-icons/lu';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import styles from './ai.module.css';
import HotelAiSearch from '../AiSearchesRes/HotelAiSearch';
import FlightAiSearch from '../AiSearchesRes/FlightAirSearch';
import UmrahGetawayAiSearch from '../AiSearchesRes/UmrahGetawayAiSearch';
import TransferAiSearch from '../AiSearchesRes/TransferAiSearch';
import ActivityAiSearch from '../AiSearchesRes/ActivityAiSearch';
import Link from 'next/link';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

function normalizeAiType(type) {
  const raw = String(type || '').toLowerCase().trim();
  if (raw === 'transfer' || raw === 'transfers') return 'transfers';
  if (raw === 'activity' || raw === 'activities' || raw === 'excursion' || raw === 'excursions') {
    return 'activities';
  }
  if (raw === 'umrah' || raw === 'umrah-getaway' || raw === 'umrah_getaway') return 'umrah_getaway';
  if (raw === 'package' || raw === 'packages' || raw === 'guided_packages') return 'guided_packages';
  return raw;
}

function missingFields(response) {
  return Array.isArray(response?.missing_fields) ? response.missing_fields : [];
}

export default function AiSearch({ categoryList }) {
  const placeholders = [
    'Best airport transfers in Makkah & Madinah...',
    '4 or 5 star hotels near Haram with best price...',
    'Top excursions and ziyarats in Saudi Arabia...',
    'Family Umrah packages with hotels & transport included...',
  ];
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);
  const [recentSearches, setRecentSearches] = useState([]);
  const [destinationList, setDestinationList] = useState([]);

  useEffect(() => {
    const savedSearches = localStorage.getItem('aiRecentSearches');
    if (savedSearches) {
      try {
        setRecentSearches(JSON.parse(savedSearches));
      } catch (e) {
        console.error('Error loading recent searches:', e);
      }
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPlaceholder((prev) => (prev + 1) % placeholders.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleSuggestionClick = (suggestion) => {
    setMessage(suggestion);
  };

  const GetDestinations = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/activities/destinations`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (data.Success === true) {
        const NewList = (data.Content?.destinations || [])
          .filter((item) => item?.city)
          .map((item) => ({
            id: item.id,
            value: item.city_slug,
            label: item.city,
            country: item.country,
          }));
        const uniqueList = [...new Map(NewList.map((item) => [item.value, item])).values()];
        setDestinationList(uniqueList);
        return uniqueList;
      }
      setDestinationList([]);
      return [];
    } catch (err) {
      console.error('Error fetching destinations:', err);
      setDestinationList([]);
      return [];
    }
  };

  const handleSubmit = async () => {
    if (!message.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setResponse(null);
    setDestinationList([]);

    const trimmedMessage = message.trim();
    const updatedSearches = [
      trimmedMessage,
      ...recentSearches.filter((s) => s !== trimmedMessage),
    ].slice(0, 4);
    setRecentSearches(updatedSearches);
    localStorage.setItem('aiRecentSearches', JSON.stringify(updatedSearches));

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_AI_API_URL}/api/ai-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.NEXT_PUBLIC_AI_API_TOKEN,
        },
        body: JSON.stringify({
          query: message,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await res.json();
      const type = normalizeAiType(data?.type);
      const normalized = { ...data, type };
      const missing = missingFields(normalized);

      if (type === 'activities' && missing.length === 0) {
        await GetDestinations();
      }

      setResponse(normalized);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const startListening = () => {
    if (!browserSupportsSpeechRecognition) return;
    if (response?.type === 'unknown' && missingFields(response).length !== 0) {
      resetTranscript();
    }
    SpeechRecognition.startListening({ continuous: true, language: 'en-US' });
  };

  const stopListening = () => {
    SpeechRecognition.stopListening();
  };

  useEffect(() => {
    if (!listening && transcript) {
      setMessage(transcript);
    }
  }, [listening, transcript]);

  useEffect(() => {
    if (!listening && transcript && message.includes(transcript)) {
      const timer = setTimeout(() => {
        handleSubmit();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [message, listening, transcript]);

  const responseType = normalizeAiType(response?.type);
  const responseMissing = missingFields(response);
  const hotelCityMissing =
    responseType === 'hotel' &&
    responseMissing.some(
      (field) => field.type === 'city' || field.message?.toLowerCase().includes('city')
    );

  return (
    <div className={styles.aiSearchContainer}>
      <div className={styles.aiSearchHeader}>
        <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
          <div className={styles.aiIconWrapper}>
            <RiRobot2Line className={styles.aiIcon} />
          </div>
          <div className={styles.aiHeaderText}>
            <h6 className={styles.aiHeaderTitle}>AI Travel Assistant</h6>
            <small className={styles.aiSubtitle}>Powered by Advanced AI</small>
          </div>
        </div>
        <div className={styles.aiStatusBadge}>
          <span className={styles.statusDot}></span>
          Online
        </div>
      </div>

      <div className={styles.aiSuggestions}>
        {recentSearches.length > 0 &&
          recentSearches.map((search, index) => (
            <div
              key={index}
              className={styles.aiSuggestionChip}
              onClick={() => handleSuggestionClick(search)}
            >
              <LuSparkle className="me-1" /> {search}
            </div>
          ))}
      </div>

      {isLoading && (
        <div className={styles.aiResponseBox}>
          <div className={styles.aiLoadingWrapper}>
            <AiOutlineLoading3Quarters className={styles.aiLoadingIcon} size={24} />
            <span className="ms-2">AI is thinking...</span>
          </div>
        </div>
      )}

      {error && (
        <div className={styles.aiResponseBox}>
          <div className={styles.aiErrorMessage}>
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      {response && !isLoading && (
        <>
          {responseType === 'hotel' && !hotelCityMissing ? (
            <HotelAiSearch searchResponse={response} />
          ) : responseType === 'flight' && responseMissing.length === 0 ? (
            <FlightAiSearch searchResponse={response} />
          ) : responseType === 'umrah_getaway' && responseMissing.length === 0 ? (
            <UmrahGetawayAiSearch searchResponse={response} />
          ) : responseType === 'transfers' && responseMissing.length === 0 ? (
            <TransferAiSearch searchResponse={response} />
          ) : responseType === 'activities' && responseMissing.length === 0 ? (
            <ActivityAiSearch searchResponse={response} destinations={destinationList} />
          ) : responseType === 'guided_packages' &&
            responseMissing.length === 0 &&
            categoryList ? (
            <div className={styles.aiResponseBox}>
              <div className={styles.aiResponseHeader}>
                <RiRobot2Line size={20} />
                <span className="ms-2">Select Package Category</span>
              </div>
              <div className={styles.aiResponseContent}>
                <p className="mb-3">Kindly select the package category you wish to explore:</p>
                <div className="d-flex flex-wrap gap-2">
                  {categoryList.map((category, index) => (
                    <Link
                      key={index}
                      href={`/packages?category_slug=${category.slug}&date=${response?.departureDate || ''}`}
                    >
                      <button type="button" className={styles.aiSuggestionChip}>
                        <LuSparkle className="me-1" />
                        {category.name}
                      </button>
                    </Link>
                  ))}
                  <Link href={`/packages?date=${response?.departureDate || ''}`}>
                    <button type="button" className={styles.aiSuggestionChip}>
                      <LuSparkle className="me-1" />
                      All
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          ) : responseMissing.length > 0 ? (
            <div className={styles.aiResponseBox}>
              <div className={styles.aiResponseHeader}>
                <RiRobot2Line size={20} />
                <span className="ms-2">AI</span>
              </div>
              <div className={styles.aiResponseContent}>
                <p className="mb-2">
                  {response?.missing_message ||
                    'Please provide a bit more detail so I can search accurately.'}
                </p>
              </div>
            </div>
          ) : (
            <div className={styles.aiResponseBox}>
              <div className={styles.aiResponseHeader}>
                <RiRobot2Line size={20} />
                <span className="ms-2">AI Response</span>
              </div>
              <div className={styles.aiResponseContent}>
                {typeof response === 'string'
                  ? response
                  : response?.message ||
                    'I understood your request, but could not start a search. Please try again with more details.'}
              </div>
            </div>
          )}
        </>
      )}

      <div className={`${styles.aiInputWrapper} ${isFocused ? styles.focused : ''}`}>
        <textarea
          rows={3}
          placeholder={placeholders[currentPlaceholder]}
          className={styles.aiTextarea}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
        ></textarea>

        <div className={styles.aiInputActions}>
          {browserSupportsSpeechRecognition && (
            <button
              type="button"
              onClick={listening ? stopListening : startListening}
              className={`${styles.aiActionBtn} ${listening ? styles.listening : ''}`}
              title={listening ? 'Stop Recording' : 'Voice Input'}
            >
              <BiMicrophone size={20} />
              {listening && <span className={styles.listeningPulse}></span>}
            </button>
          )}
          <button
            type="button"
            className={styles.aiSendBtn}
            title="Send Message"
            onClick={handleSubmit}
            disabled={isLoading || !message.trim()}
          >
            {isLoading ? (
              <AiOutlineLoading3Quarters className={styles.aiLoadingIcon} size={18} />
            ) : (
              <FiSend size={18} />
            )}
          </button>
        </div>
      </div>

      <p className={styles.aiInfoText}>
        <LuSparkle className="me-1" />
        Our AI assistant is here to help you quickly search and discover any service on our website.
      </p>
    </div>
  );
}
