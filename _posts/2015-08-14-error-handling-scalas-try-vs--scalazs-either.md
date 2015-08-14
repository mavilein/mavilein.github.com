---
layout: post
title: "Error Handling: Scala's Try vs  Scalaz's Either/Disjunction"
description: ""
category: Scala
tags: [scala]
---
{% include JB/setup %}

Today we're going to compare two ways of handling errors in Scala. First we will look at the type `\/` from the `Scalaz` library. This type is usually called `Either` or `Disjunction`. Next we will look at the `Try` type from the Scala standard library. We go through the same example with both types to show their respective strengths and weaknesses.

A quick side note: You might ask yourself why i have not included the `Either` type from the Scala standard library as well. It is a pity that both Scalaz and Scala have a type with this name as this causes a lot of confusion in my opinion. Let me assure you that those should not be really compared as they are useful for pretty much different things.

### The example scenario

We are going to look a small imaginary Todo list application. Our "domain model" looks like this:

{% highlight scala %}
case class TaskList(title: String)
case class User(id: Long)
{% endhighlight %} 

As you can see this is a not a really useful Todo list, but it will be enough to explore different ways of error handling. What we will try to is authenticating a User and afterwards fetch all his lists. The following are the functions/methods that are provided to us:

{% highlight scala %}
trait EitherTodoService {
  def authenticate(userId: String, secret: String): \/[MyError, User]
  def fetchLists(user: User): \/[MyError, Seq[TaskList]]
}
trait TryTodoService {
  def authenticate(userId: String, secret: String): Try[User]
  def listsForUser(userId: String, secret: String): Try[Seq[TaskList]]
}
{% endhighlight %} 

As you can see someone was so nice to provide us with two different implementations. So we can explore both ways of handling errors. Our task is to write a function that that accepts a userId and a secret and returns a `Seq` of all the `TaskList`s the user has. So these functions are a really great foundation, we just need to build upon them.


### The version based on Scalaz's Either, Disjunction or \/

We are supposed to implement this function, while we have access to the variable service of type `EitherTodoService`.

{% highlight scala %}
trait EitherTodoService {
  def authenticate(userId: String, secret: String): \/[MyError, User]
  def fetchLists(user: User): \/[MyError, Seq[TaskList]]
}
val service: EitherTodoService = ??? // i don't show you the implementation yet :)

def listsForUser(userId: String, secret: String): \/[MyError, Seq[TaskList]] = ???
{% endhighlight %} 

Let's briefly talk about the return type of `EitherTodoService`. The return type indicates that we are getting either an error of type `MyError` or the successful result in the form of a `User` or `Seq[TaskList]`. The error side is a strong part of the Scalaz Either. It is clearly showing what kind of errors we should expect. We can simply lookup its declaration:

{% highlight scala %}
sealed trait MyError
case class UnknownUser(userId: Long) extends MyError {
	override def toString = s"User with id [$userId] is unknown."
}
case class WrongSecret(userId: Long) extends MyError {
	override def toString = s"User with id [$userId] provided the wrong secret."
}
case class ServiceUnavailable(service: String) extends MyError {
	override def toString = s"The Service [$service] is currently unavailable"
}
{% endhighlight %} 

It's always a good idea to declare your as a `sealed` type. This means you can only extend this type in the same source file. So at compile time all possible errors are known to you as a client. As we can see we might get back an error if a `User` does not exist for a given id or the provided secret was wrong. And we might even get back a `ServiceUnavailable` Error if `EitherTodoService` is not available at the moment (database or other application down). These are all the error cases we should think about and what to do when they occur.


But first let's start with an implementation of the happy path ignoring the errors for now. This looks like an easy task with a for comprehension. We simply call `authenticate` with the arguments we are given and afterwards go on to call `fetchLists` with user we received as a result in the first step.

{% highlight scala %}
def listsForUser(userId: String, secret: String): \/[MyError, Seq[TaskList]] = {
    for {
      user  <- service.authenticate(userId, secret)
      lists <- service.fetchLists(user)
    } yield lists
}
{% endhighlight %} 

Now let's talk about error handling. We can't do much when a user is unknown of his secret is not valid. Assume that we currently have a hard time with our infrastructure. Therefore different services are unfortunately down very often. So we are getting very often `ServiceUnavailable` Error. Our method should handle this error case and just return an empty `Seq[TaskList]`. For some reason the business considers this better than not failing fully.
Therefore we extend our implementation to analyze the result of the for comprehension before returning something. We pattern match the result to see wether it's a (successful) right result. If so we just return it. But if it is a left result and the contained error is `ServiceUnavailable` we return the empty `Seq[TaskList]`as a successful right result instead. All other are returned unchanged.

{% highlight scala %}
def listsForUser(userId: String, secret: String): \/[MyError, Seq[TaskList]] = {
	val listsForUser: \/[MyError, Seq[TaskList]] = for {
	  user  <- service.authenticate(userId, secret)
	  lists <- service.fetchLists(user)
	} yield lists

	listsForUser match {
	  case lists @ \/-(_) =>
	    lists
	  case -\/(_ : ServiceUnavailable) =>
	    \/.right(Seq.empty[TaskList])
	  case error @ -\/(_) =>
	    error
	}
}
{% endhighlight %} 