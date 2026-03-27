import { useEffect, useState } from "react"
import { useWallet } from "@/hooks/use-wallet"
import { questClient } from "@/lib/contracts/quest"

export type UserRole = "owner" | "learner" | "mixed" | "unknown"

export interface UserRoleData {
    role: UserRole
    isOwner: boolean
    isEnrolled: boolean
    isLoading: boolean
    error: string | null
}

/**
 * Hook to determine user's role based on their participation in quests.
 * Checks if user is a quest owner, learner, or both.
 */
export function useUserRole(): UserRoleData {
    const { address, connected } = useWallet()
    const [roleData, setRoleData] = useState<UserRoleData>({
        role: "unknown",
        isOwner: false,
        isEnrolled: false,
        isLoading: false,
        error: null,
    })

    useEffect(() => {
        if (!connected || !address) {
            setRoleData({
                role: "unknown",
                isOwner: false,
                isEnrolled: false,
                isLoading: false,
                error: null,
            })
            return
        }

        const determineRole = async () => {
            setRoleData(prev => ({ ...prev, isLoading: true, error: null }))

            try {
                // Get all quests to check ownership and enrollment
                const quests = await questClient.getQuests()

                let isOwner = false
                let isEnrolled = false

                for (const quest of quests) {
                    // Check if user is owner
                    if (quest.owner === address) {
                        isOwner = true
                    }

                    // Check if user is enrolled
                    const enrollees = await questClient.getEnrollees(quest.id)
                    if (enrollees.includes(address)) {
                        isEnrolled = true
                    }

                    // Early exit if we've found both
                    if (isOwner && isEnrolled) break
                }

                // Determine role based on participation
                let role: UserRole = "unknown"
                if (isOwner && isEnrolled) {
                    role = "mixed"
                } else if (isOwner) {
                    role = "owner"
                } else if (isEnrolled) {
                    role = "learner"
                }

                setRoleData({
                    role,
                    isOwner,
                    isEnrolled,
                    isLoading: false,
                    error: null,
                })
            } catch (err) {
                const message = err instanceof Error ? err.message : "Failed to determine user role"
                setRoleData(prev => ({
                    ...prev,
                    isLoading: false,
                    error: message,
                    role: "unknown",
                }))
            }
        }

        void determineRole()
    }, [connected, address])

    return roleData
}
