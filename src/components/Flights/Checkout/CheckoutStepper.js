'use client'

import React from 'react'
import Link from 'next/link'
import { FaCheck, FaChevronLeft } from 'react-icons/fa'
import styles from './CheckoutStepper.module.css'

export default function CheckoutStepper({
    steps = [],
    currentStepId,
    completedStepIds = [],
    onStepClick,
    backHref = '/flights',
    backLabel = 'Back to flight details',
    showBackLink = true,
}) {
    const currentIndex = Math.max(0, steps.findIndex((s) => s.id === currentStepId))
    const completedSet = new Set(completedStepIds)

    if (!steps.length) return null

    return (
        <div className={styles.wrap}>
            {showBackLink && backHref && (
                <Link href={backHref} className={styles.backLink}>
                    <FaChevronLeft className={styles.backIcon} aria-hidden />
                    {backLabel}
                </Link>
            )}

            <nav className={styles.stepper} aria-label="Checkout steps">
                <ol className={styles.list}>
                    {steps.map((step, index) => {
                        const isCompleted = completedSet.has(step.id) || index < currentIndex
                        const isActive = step.id === currentStepId
                        const isUpcoming = !isCompleted && !isActive
                        const canClick = typeof onStepClick === 'function' && (isCompleted || isActive)

                        return (
                            <li
                                key={step.id}
                                className={[
                                    styles.item,
                                    isCompleted ? styles.completed : '',
                                    isActive ? styles.active : '',
                                    isUpcoming ? styles.upcoming : '',
                                ]
                                    .filter(Boolean)
                                    .join(' ')}
                            >
                                {index > 0 && (
                                    <span
                                        className={`${styles.connector} ${
                                            index <= currentIndex || completedSet.has(steps[index - 1]?.id)
                                                ? styles.connectorDone
                                                : ''
                                        }`}
                                        aria-hidden
                                    />
                                )}
                                <button
                                    type="button"
                                    className={styles.stepBtn}
                                    disabled={!canClick}
                                    onClick={() => canClick && onStepClick(step.id)}
                                    aria-current={isActive ? 'step' : undefined}
                                >
                                    <span className={styles.circleWrap}>
                                        <span className={styles.circle}>
                                            {isCompleted && !isActive ? <FaCheck /> : index + 1}
                                        </span>
                                    </span>
                                    <span className={styles.label}>{step.label}</span>
                                </button>
                            </li>
                        )
                    })}
                </ol>
            </nav>
        </div>
    )
}
