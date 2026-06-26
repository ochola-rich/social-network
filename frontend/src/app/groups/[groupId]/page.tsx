"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuthStore } from "@/store/authStore";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiClient } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Users,
  Calendar,
  Send,
  UserPlus,
  MessageSquare,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

type Tab = "discussion" | "members" | "events";

export default function GroupDetailPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = Number(params.groupId);
  const { user, isLoading: authLoading, fetchCurrentUser } = useAuthStore();

  const [groupData, setGroupData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("discussion");
  const [newPostContent, setNewPostContent] = useState("");
  const [commentContents, setCommentContents] = useState<
    Record<number, string>
  >({});

  // Comments dropdown state
  const [expandedComments, setExpandedComments] = useState<
    Record<number, boolean>
  >({});
  const [postComments, setPostComments] = useState<Record<number, any[]>>({});

  const [eventTitle, setEventTitle] = useState("");
  const [eventDesc, setEventDesc] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [inviteUserId, setInviteUserId] = useState("");

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  const fetchGroup = async () => {
    setIsLoading(true);
    try {
      const { data } = await apiClient.get(`/api/groups/${groupId}`);
      setGroupData(data);
    } catch (err) {
      console.error("Failed to fetch group:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && groupId) fetchGroup();
  }, [user, groupId]);

  const handleJoinGroup = async () => {
    try {
      await apiClient.post(`/api/groups/${groupId}/join`);
      fetchGroup();
    } catch (err) {
      console.error("Join failed:", err);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;
    try {
      await apiClient.post(`/api/groups/${groupId}/posts`, {
        content: newPostContent,
      });
      setNewPostContent("");
      fetchGroup();
    } catch (err) {
      console.error("Create post failed:", err);
    }
  };

  const handleAddComment = async (postId: number) => {
    const content = commentContents[postId];
    if (!content?.trim()) return;
    try {
      await apiClient.post(`/api/groups/posts/${postId}/comment`, { content });
      setCommentContents((prev) => ({ ...prev, [postId]: "" }));

      // Refetch comments for this post to show the new one immediately
      const { data } = await apiClient.get(
        `/api/groups/posts/${postId}/comments`,
      );
      setPostComments((prev) => ({ ...prev, [postId]: data.comments || [] }));

      // Update overall comment count
      fetchGroup();
    } catch (err) {
      console.error("Add comment failed:", err);
    }
  };

  const toggleGroupComments = async (postId: number) => {
    if (!expandedComments[postId]) {
      try {
        const { data } = await apiClient.get(
          `/api/groups/posts/${postId}/comments`,
        );
        setPostComments((prev) => ({ ...prev, [postId]: data.comments || [] }));
      } catch (err) {
        console.error("Failed to fetch group comments", err);
      }
    }
    setExpandedComments((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleCreateEvent = async () => {
    if (!eventTitle.trim() || !eventTime) return;
    try {
      const dayTime = new Date(eventTime).toISOString();
      await apiClient.post(`/api/groups/${groupId}/events`, {
        title: eventTitle,
        description: eventDesc,
        day_time: dayTime,
      });
      setEventTitle("");
      setEventDesc("");
      setEventTime("");
      fetchGroup();
    } catch (err) {
      console.error("Create event failed:", err);
    }
  };

  const handleEventResponse = async (eventId: number, response: string) => {
    try {
      await apiClient.post(`/api/events/${eventId}/respond`, { response });
      fetchGroup();
    } catch (err) {
      console.error("Event response failed:", err);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteUserId) return;
    try {
      await apiClient.post(`/api/groups/${groupId}/invite`, {
        user_id: Number(inviteUserId),
      });
      setInviteUserId("");
      alert("Invitation sent!");
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to invite");
    }
  };

  const handleAcceptMember = async (memberId: number) => {
    try {
      await apiClient.post(`/api/groups/${groupId}/accept/${memberId}`);
      fetchGroup();
    } catch (err) {
      console.error("Accept failed:", err);
    }
  };

  const handleDeclineMember = async (memberId: number) => {
    try {
      await apiClient.post(`/api/groups/${groupId}/decline/${memberId}`);
      fetchGroup();
    } catch (err) {
      console.error("Decline failed:", err);
    }
  };

  if (authLoading || isLoading || !user || !groupData) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </MainLayout>
    );
  }

  const { group, members, posts, events } = groupData;
  const isMember = members?.some(
    (m: any) => m.id === user.id && m.status === "accepted",
  );
  const isCreator = group.creator_id === user.id;

  return (
    <MainLayout>
      <div className="min-h-screen bg-background pb-24">
        <div className="max-w-4xl mx-auto w-full">
          {/* Group Header */}
          <div className="p-8 border-b border-outline-variant bg-surface-container-lowest">
            <h1 className="text-2xl font-bold text-on-surface mb-2 tracking-tight">
              {group.title}
            </h1>
            <p className="text-sm text-on-surface-variant leading-relaxed mb-6 max-w-2xl">
              {group.description}
            </p>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-on-surface-variant">
                <Users size={16} strokeWidth={2} />
                <span className="text-xs font-mono font-semibold uppercase tracking-wider">
                  {members?.length || 0} Members
                </span>
              </div>
              {!isMember && !isCreator && (
                <Button
                  onClick={handleJoinGroup}
                  size="sm"
                  className="rounded-xl"
                >
                  Request to Join
                </Button>
              )}
              {(isMember || isCreator) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("members")}
                  className="rounded-xl gap-2"
                >
                  <UserPlus size={14} />
                  Invite Members
                </Button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <nav className="sticky top-0 z-20 bg-surface/80 backdrop-blur-md border-b border-outline-variant">
            <div className="flex px-6">
              {(["discussion", "members", "events"] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-6 py-4 text-xs font-bold uppercase tracking-wider transition-all duration-200 relative",
                    activeTab === tab
                      ? "text-primary"
                      : "text-on-surface-variant hover:text-on-surface",
                  )}
                >
                  {tab}
                  {activeTab === tab && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </nav>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Discussion Tab */}
            {activeTab === "discussion" && (
              <>
                {(isMember || isCreator) && (
                  <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5">
                    <textarea
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      className="w-full bg-transparent text-on-surface focus:outline-none resize-none min-h-[80px] text-sm placeholder:text-on-surface-variant/50"
                      placeholder="Share something with the group..."
                    />
                    <div className="flex justify-end mt-3">
                      <Button
                        onClick={handleCreatePost}
                        disabled={!newPostContent.trim()}
                        size="sm"
                        className="rounded-xl"
                      >
                        Post to Group
                      </Button>
                    </div>
                  </div>
                )}

                {!posts || posts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-6 bg-surface-container-lowest border border-outline-variant rounded-2xl">
                    <div className="w-12 h-12 bg-primary/5 rounded-xl flex items-center justify-center mb-4">
                      <MessageSquare className="text-primary/30" size={20} />
                    </div>
                    <p className="text-sm font-bold text-on-surface mb-1">
                      No posts yet
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      Be the first to start the conversation.
                    </p>
                  </div>
                ) : (
                  posts.map((post: any) => (
                    <div
                      key={post.id}
                      className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <Avatar
                          src={post.user?.avatar}
                          alt={post.user?.first_name}
                          size="sm"
                          className="rounded-xl"
                        />
                        <div>
                          <p className="font-bold text-on-surface text-sm">
                            {post.user?.first_name} {post.user?.last_name}
                          </p>
                          <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">
                            {new Date(post.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-on-surface leading-relaxed mb-4">
                        {post.content}
                      </p>

                      {/* Comments Dropdown Toggle */}
                      <div className="border-t border-outline-variant pt-4">
                        <button
                          onClick={() => toggleGroupComments(post.id)}
                          className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors mb-3"
                        >
                          <MessageSquare size={16} strokeWidth={2} />
                          <span className="text-xs font-semibold">
                            {post.comment_count || 0} Comments
                          </span>
                          {expandedComments[post.id] ? (
                            <ChevronUp size={16} />
                          ) : (
                            <ChevronDown size={16} />
                          )}
                        </button>

                        {/* Expanded Comments List */}
                        {expandedComments[post.id] && (
                          <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                            {(postComments[post.id] || []).length === 0 ? (
                              <p className="text-center text-on-surface-variant text-sm py-2">
                                No comments yet.
                              </p>
                            ) : (
                              <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                                {(postComments[post.id] || []).map(
                                  (comment: any) => (
                                    <div
                                      key={comment.id}
                                      className="flex gap-3"
                                    >
                                      <Avatar
                                        src={comment.user?.avatar}
                                        alt={comment.user?.first_name}
                                        size="sm"
                                        className="w-8 h-8 rounded-lg flex-shrink-0"
                                      />
                                      <div className="flex-1 bg-surface-container-low p-3 rounded-lg rounded-tl-none">
                                        <p className="font-bold text-xs text-on-surface mb-1">
                                          {comment.user?.first_name}{" "}
                                          {comment.user?.last_name}
                                          <span className="font-normal text-on-surface-variant ml-2 text-[10px]">
                                            {new Date(
                                              comment.created_at,
                                            ).toLocaleTimeString()}
                                          </span>
                                        </p>
                                        <p className="text-sm text-on-surface-variant">
                                          {comment.content}
                                        </p>
                                      </div>
                                    </div>
                                  ),
                                )}
                              </div>
                            )}

                            {/* Add Comment Input */}
                            {(isMember || isCreator) && (
                              <div className="flex gap-2 items-center pt-2">
                                <input
                                  type="text"
                                  value={commentContents[post.id] || ""}
                                  onChange={(e) =>
                                    setCommentContents((prev) => ({
                                      ...prev,
                                      [post.id]: e.target.value,
                                    }))
                                  }
                                  onKeyDown={(e) =>
                                    e.key === "Enter" &&
                                    handleAddComment(post.id)
                                  }
                                  placeholder="Add a comment..."
                                  className="flex-1 bg-surface-container-low border border-outline-variant rounded-full px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-colors placeholder:text-on-surface-variant/50"
                                />
                                <button
                                  onClick={() => handleAddComment(post.id)}
                                  className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors"
                                >
                                  <Send size={16} />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </>
            )}

            {/* Members Tab */}
            {activeTab === "members" && (
              <>
                {(isMember || isCreator) && (
                  <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 flex gap-4 items-end">
                    <div className="flex-1">
                      <Input
                        label="Invite User by ID"
                        type="number"
                        value={inviteUserId}
                        onChange={(e) => setInviteUserId(e.target.value)}
                        placeholder="Enter User ID"
                      />
                    </div>
                    <Button
                      onClick={handleInviteUser}
                      disabled={!inviteUserId}
                      className="rounded-xl"
                    >
                      Send Invite
                    </Button>
                  </div>
                )}
                <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl divide-y divide-outline-variant">
                  {members?.map((member: any) => (
                    <div
                      key={member.id}
                      className="p-5 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={member.avatar}
                          alt={member.first_name}
                          size="md"
                          className="rounded-xl"
                        />
                        <div>
                          <p className="font-bold text-on-surface text-sm">
                            {member.first_name} {member.last_name}
                          </p>
                          <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">
                            {member.status}
                          </p>
                        </div>
                      </div>
                      {isCreator && member.status === "requested" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleAcceptMember(member.id)}
                            className="rounded-xl"
                          >
                            Accept
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeclineMember(member.id)}
                            className="rounded-xl"
                          >
                            Decline
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Events Tab */}
            {activeTab === "events" && (
              <>
                {(isMember || isCreator) && (
                  <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 space-y-4">
                    <h3 className="text-base font-bold text-on-surface tracking-tight">
                      Create Event
                    </h3>
                    <Input
                      label="Title"
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                    />
                    <Input
                      label="Description"
                      value={eventDesc}
                      onChange={(e) => setEventDesc(e.target.value)}
                    />
                    <Input
                      label="Date & Time"
                      type="datetime-local"
                      value={eventTime}
                      onChange={(e) => setEventTime(e.target.value)}
                    />
                    <Button
                      onClick={handleCreateEvent}
                      disabled={!eventTitle || !eventTime}
                      className="rounded-xl"
                    >
                      Create Event
                    </Button>
                  </div>
                )}

                {!events || events.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-6 bg-surface-container-lowest border border-outline-variant rounded-2xl">
                    <div className="w-12 h-12 bg-primary/5 rounded-xl flex items-center justify-center mb-4">
                      <Calendar className="text-primary/30" size={20} />
                    </div>
                    <p className="text-sm font-bold text-on-surface mb-1">
                      No events scheduled
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      Plan something for the group.
                    </p>
                  </div>
                ) : (
                  events.map((event: any) => {
                    const goingCount =
                      event.responses?.filter(
                        (r: any) => r.response === "going",
                      ).length || 0;
                    const notGoingCount =
                      event.responses?.filter(
                        (r: any) => r.response === "not_going",
                      ).length || 0;
                    const userResponse = event.responses?.find(
                      (r: any) => r.user_id === user.id,
                    )?.response;

                    return (
                      <div
                        key={event.id}
                        className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6"
                      >
                        <div className="flex items-start gap-4 mb-4">
                          <div className="p-3 bg-primary/10 rounded-xl">
                            <Calendar
                              className="text-primary"
                              size={24}
                              strokeWidth={2}
                            />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-on-surface tracking-tight">
                              {event.title}
                            </h3>
                            <p className="text-sm text-on-surface-variant leading-relaxed mt-1">
                              {event.description}
                            </p>
                            <p className="text-[10px] font-mono text-primary font-semibold uppercase tracking-wider mt-2">
                              {new Date(event.day_time).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 pt-4 border-t border-outline-variant">
                          <span className="text-[10px] font-mono font-semibold text-on-surface-variant uppercase tracking-wider">
                            Going: {goingCount} | Not Going: {notGoingCount}
                          </span>
                          <div className="ml-auto flex gap-2">
                            <Button
                              variant={
                                userResponse === "going" ? "primary" : "outline"
                              }
                              size="sm"
                              onClick={() =>
                                handleEventResponse(event.id, "going")
                              }
                              className="rounded-xl"
                            >
                              Going
                            </Button>
                            <Button
                              variant={
                                userResponse === "not_going"
                                  ? "primary"
                                  : "outline"
                              }
                              size="sm"
                              onClick={() =>
                                handleEventResponse(event.id, "not_going")
                              }
                              className="rounded-xl"
                            >
                              Not Going
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
